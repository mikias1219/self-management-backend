import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  parseISO,
  subDays,
} from 'date-fns';
import { Between, Repository } from 'typeorm';
import { IncomeSource } from '../../../../common/domain/enums/income-source.enum';
import { UserSettings } from '../../../settings/domain/entities/user-settings.entity';
import { ExpenseCategory } from '../../domain/entities/expense-category.entity';
import { FinanceBudget } from '../../domain/entities/budget.entity';
import { FinanceCycle } from '../../domain/entities/finance-cycle.entity';
import { PendingObligation } from '../../domain/entities/pending-obligation.entity';
import { RecurringObligation } from '../../domain/entities/recurring-obligation.entity';
import { SavingsGoal } from '../../domain/entities/savings-goal.entity';
import { FinanceTransaction } from '../../domain/entities/transaction.entity';
import {
  ExpenseClassificationType,
  FinanceCycleStatus,
  PendingObligationStatus,
  TransactionType,
} from '../../domain/enums/finance.enums';
import { UpdateCycleAllocationDto } from '../dto/update-cycle-allocation.dto';

function toNum(v: unknown): number {
  return Number(v ?? 0);
}

@Injectable()
export class FinanceCyclesService {
  constructor(
    @InjectRepository(FinanceCycle)
    private readonly cyclesRepo: Repository<FinanceCycle>,
    @InjectRepository(UserSettings)
    private readonly settingsRepo: Repository<UserSettings>,
    @InjectRepository(FinanceTransaction)
    private readonly txRepo: Repository<FinanceTransaction>,
    @InjectRepository(PendingObligation)
    private readonly pendingRepo: Repository<PendingObligation>,
    @InjectRepository(RecurringObligation)
    private readonly recurringRepo: Repository<RecurringObligation>,
    @InjectRepository(ExpenseCategory)
    private readonly expenseCatRepo: Repository<ExpenseCategory>,
    @InjectRepository(FinanceBudget)
    private readonly budgetsRepo: Repository<FinanceBudget>,
    @InjectRepository(SavingsGoal)
    private readonly savingsRepo: Repository<SavingsGoal>,
  ) {}

  async listForUser(userId: string): Promise<FinanceCycle[]> {
    return this.cyclesRepo.find({
      where: { createdBy: userId },
      order: { startDate: 'DESC' },
    });
  }

  async getOneForUser(userId: string, id: string): Promise<FinanceCycle> {
    const cycle = await this.cyclesRepo.findOne({
      where: { id, createdBy: userId },
    });
    if (!cycle) {
      throw new BadRequestException('Finance cycle not found');
    }
    return cycle;
  }

  async findOpenCycle(userId: string): Promise<FinanceCycle | null> {
    return this.cyclesRepo.findOne({
      where: { createdBy: userId, cycleStatus: FinanceCycleStatus.OPEN },
      order: { startDate: 'DESC' },
    });
  }

  /** Read-only: returns the open cycle without recomputing totals. */
  async getCurrent(userId: string): Promise<FinanceCycle | null> {
    return this.findOpenCycle(userId);
  }

  private async getSalaryDay(userId: string): Promise<number> {
    const settings = await this.settingsRepo.findOne({
      where: { createdBy: userId },
    });
    return Math.min(31, Math.max(1, settings?.salaryDay ?? 25));
  }

  private cycleEndFromStart(start: Date, salaryDay: number): string {
    const nextMonth = addMonths(start, 1);
    const nextSalary = new Date(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      salaryDay,
    );
    return format(subDays(nextSalary, 1), 'yyyy-MM-dd');
  }

  private dueDateInCycle(
    cycleStart: string,
    cycleEnd: string,
    dueDay: number,
  ): string {
    const start = parseISO(cycleStart);
    const clampedDay = Math.min(
      dueDay,
      new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate(),
    );
    const candidate = format(
      new Date(start.getFullYear(), start.getMonth(), clampedDay),
      'yyyy-MM-dd',
    );
    if (candidate >= cycleStart && candidate <= cycleEnd) return candidate;
    const next = addMonths(start, 1);
    const nextClamped = Math.min(
      dueDay,
      new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate(),
    );
    return format(
      new Date(next.getFullYear(), next.getMonth(), nextClamped),
      'yyyy-MM-dd',
    );
  }

  async generatePendingObligations(
    userId: string,
    cycle: FinanceCycle,
  ): Promise<void> {
    const existing = await this.pendingRepo.count({
      where: { createdBy: userId, cycleId: cycle.id },
    });
    if (existing > 0) return;

    const [recurring, fixedCats] = await Promise.all([
      this.recurringRepo.find({
        where: { createdBy: userId, isActive: true },
      }),
      this.expenseCatRepo.find({
        where: {
          createdBy: userId,
          classificationType: ExpenseClassificationType.FIXED_OBLIGATION,
        },
      }),
    ]);

    const pending: Partial<PendingObligation>[] = [];

    for (const r of recurring) {
      pending.push({
        createdBy: userId,
        cycleId: cycle.id,
        recurringObligationId: r.id,
        name: r.name,
        expectedAmount: toNum(r.amount),
        dueDate: this.dueDateInCycle(
          cycle.startDate,
          cycle.endDate,
          r.dueDayOfMonth,
        ),
        obligationStatus: PendingObligationStatus.PENDING,
      });
    }

    for (const c of fixedCats) {
      if (!c.dueDay || !c.expectedAmount) continue;
      const dup = pending.some(
        (p) => p.name === c.name && p.expectedAmount === toNum(c.expectedAmount),
      );
      if (dup) continue;
      pending.push({
        createdBy: userId,
        cycleId: cycle.id,
        categoryId: c.id,
        name: c.name,
        expectedAmount: toNum(c.expectedAmount),
        dueDate: this.dueDateInCycle(cycle.startDate, cycle.endDate, c.dueDay),
        obligationStatus: PendingObligationStatus.PENDING,
      });
    }

    if (pending.length > 0) {
      await this.pendingRepo.save(
        pending.map((p) => this.pendingRepo.create(p)),
      );
    }
  }

  async markOverdueObligations(userId: string, cycleId: string): Promise<void> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const grace = format(addDays(new Date(), -3), 'yyyy-MM-dd');
    const pending = await this.pendingRepo.find({
      where: {
        createdBy: userId,
        cycleId,
        obligationStatus: PendingObligationStatus.PENDING,
      },
    });
    const toMarkOverdue: PendingObligation[] = [];
    for (const o of pending) {
      if (o.dueDate <= grace) {
        o.obligationStatus = PendingObligationStatus.OVERDUE;
        toMarkOverdue.push(o);
      } else if (o.dueDate < today) {
        // still within grace — keep pending until dueDay+3
        const due = parseISO(o.dueDate);
        const overdueAfter = format(addDays(due, 3), 'yyyy-MM-dd');
        if (today > overdueAfter) {
          o.obligationStatus = PendingObligationStatus.OVERDUE;
          toMarkOverdue.push(o);
        }
      }
    }
    if (toMarkOverdue.length > 0) {
      await this.pendingRepo.save(toMarkOverdue);
    }
  }

  async refreshCycleTotals(
    userId: string,
    cycle: FinanceCycle,
  ): Promise<FinanceCycle> {
    const txs = await this.txRepo.find({
      where: {
        createdBy: userId,
        transactionDate: Between(cycle.startDate, cycle.endDate),
      },
      relations: { expenseCategory: true },
    });

    let totalFixed = 0;
    let totalSavings = 0;
    let totalVariable = 0;

    for (const tx of txs) {
      const amt = toNum(tx.netAmount ?? tx.amount);
      if (tx.transactionType === TransactionType.TRANSFER) {
        totalSavings += amt;
      } else if (tx.transactionType === TransactionType.EXPENSE) {
        const cls = tx.expenseCategory?.classificationType;
        if (cls === ExpenseClassificationType.FIXED_OBLIGATION) {
          totalFixed += amt;
        } else if (cls !== ExpenseClassificationType.SAVINGS_TRANSFER) {
          totalVariable += amt;
        }
      }
    }

    cycle.totalFixedObligations = totalFixed;
    cycle.totalSavingsAllocated = totalSavings;
    cycle.totalVariableSpent = totalVariable;
    cycle.remainingBalance =
      toNum(cycle.netSalary) - totalFixed - totalSavings - totalVariable;

    return this.cyclesRepo.save(cycle);
  }

  private async closeCycleWithMetrics(
    userId: string,
    cycle: FinanceCycle,
  ): Promise<void> {
    cycle = await this.refreshCycleTotals(userId, cycle);

    const txs = await this.txRepo.find({
      where: {
        createdBy: userId,
        transactionDate: Between(cycle.startDate, cycle.endDate),
        transactionType: TransactionType.EXPENSE,
      },
      relations: { expenseCategory: true },
    });
    const catTotals = new Map<string, number>();
    const catNames = new Map<string, string>();

    let discretionary = 0;
    for (const tx of txs) {
      const amt = toNum(tx.amount);
      if (
        tx.expenseCategory?.classificationType ===
        ExpenseClassificationType.DISCRETIONARY
      ) {
        discretionary += amt;
      }
      const key = tx.categoryId ?? 'uncategorized';
      if (tx.expenseCategory) {
        catNames.set(key, tx.expenseCategory.name);
      }
      catTotals.set(key, (catTotals.get(key) ?? 0) + amt);
    }

    const gross = toNum(cycle.grossSalary) || toNum(cycle.netSalary);
    const net = toNum(cycle.netSalary);
    cycle.actualSavingsRate =
      net > 0
        ? Math.round((toNum(cycle.totalSavingsAllocated) / net) * 1000) / 10
        : 0;
    cycle.fixedObligationRate =
      gross > 0
        ? Math.round((toNum(cycle.totalFixedObligations) / gross) * 1000) / 10
        : 0;
    cycle.discretionaryRate =
      net > 0 ? Math.round((discretionary / net) * 1000) / 10 : 0;

    let largestCat = '';
    let largestAmt = 0;
    for (const [id, amt] of catTotals) {
      if (amt > largestAmt) {
        largestAmt = amt;
        largestCat = catNames.get(id) ?? 'Uncategorized';
      }
    }
    cycle.largestExpenseCategory = largestCat || undefined;
    cycle.unspentBudget = Math.max(
      0,
      toNum(cycle.spendingBudget) - toNum(cycle.totalVariableSpent),
    );

    const savingsRateScore = Math.min(100, cycle.actualSavingsRate * 2.5);
    const fixedScore = Math.max(
      0,
      100 - Math.abs(cycle.fixedObligationRate - 50) * 2,
    );
    const budgetAdherence =
      toNum(cycle.spendingBudget) > 0
        ? Math.max(
            0,
            100 -
              Math.max(
                0,
                (toNum(cycle.totalVariableSpent) / toNum(cycle.spendingBudget) -
                  1) *
                  100,
              ),
          )
        : 50;
    cycle.financialHealthScore = Math.round(
      savingsRateScore * 0.4 + fixedScore * 0.3 + budgetAdherence * 0.3,
    );

    // Savings shortfall per goal
    const goals = await this.savingsRepo.find({ where: { createdBy: userId } });
    let totalShortfall = 0;
    for (const g of goals) {
      const target = toNum(g.monthlyTargetAmount);
      if (target <= 0) continue;
      const savingsInCycle = await this.txRepo.find({
        where: {
          createdBy: userId,
          savingsGoalId: g.id,
          transactionDate: Between(cycle.startDate, cycle.endDate),
        },
      });
      const saved = savingsInCycle.reduce(
        (sum, tx) => sum + toNum(tx.amount),
        0,
      );
      const shortfall = Math.max(0, target - saved);
      if (shortfall > 0) {
        g.savingsShortfallCarryForward =
          toNum(g.savingsShortfallCarryForward) + shortfall;
        totalShortfall += shortfall;
        await this.savingsRepo.save(g);
      }
    }
    cycle.savingsShortfall = totalShortfall;

    cycle.cycleStatus = FinanceCycleStatus.CLOSED;
    cycle.closedAt = new Date();
    await this.cyclesRepo.save(cycle);
  }

  async openFromSalaryTx(
    userId: string,
    salaryTx: FinanceTransaction,
    salaryBreakdown?: { gross?: number; net?: number },
  ): Promise<{ cycle: FinanceCycle; hadSalaryAlready: boolean }> {
    const salaryDay = await this.getSalaryDay(userId);
    const start = parseISO(salaryTx.transactionDate);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Invalid salary transactionDate');
    }

    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = this.cycleEndFromStart(start, salaryDay);

    const existingOpen = await this.findOpenCycle(userId);
    let hadSalaryAlready = false;

    if (existingOpen) {
      const salaryInCycle = await this.txRepo.count({
        where: {
          createdBy: userId,
          transactionType: TransactionType.INCOME,
          incomeSource: IncomeSource.SALARY,
          transactionDate: Between(existingOpen.startDate, existingOpen.endDate),
        },
      });
      if (
        salaryTx.transactionDate >= existingOpen.startDate &&
        salaryTx.transactionDate <= existingOpen.endDate &&
        salaryInCycle > 1
      ) {
        hadSalaryAlready = true;
      }

      if (existingOpen.startDate !== startStr) {
        await this.closeCycleWithMetrics(userId, existingOpen);
      } else {
        existingOpen.grossSalary =
          toNum(salaryBreakdown?.gross) || toNum(salaryTx.grossAmount);
        existingOpen.netSalary =
          toNum(salaryBreakdown?.net) ||
          toNum(salaryTx.netAmount ?? salaryTx.amount);
        const saved = await this.cyclesRepo.save(existingOpen);
        salaryTx.cycleId = saved.id;
        await this.txRepo.save(salaryTx);
        return { cycle: saved, hadSalaryAlready };
      }
    }

    const cycle = this.cyclesRepo.create({
      createdBy: userId,
      startDate: startStr,
      endDate: endStr,
      cycleStatus: FinanceCycleStatus.OPEN,
      grossSalary: toNum(salaryBreakdown?.gross ?? salaryTx.grossAmount),
      netSalary: toNum(
        salaryBreakdown?.net ?? salaryTx.netAmount ?? salaryTx.amount,
      ),
      spendingBudget: toNum(
        salaryBreakdown?.net ?? salaryTx.netAmount ?? salaryTx.amount,
      ),
    });
    const saved = await this.cyclesRepo.save(cycle);
    salaryTx.cycleId = saved.id;
    await this.txRepo.save(salaryTx);
    await this.generatePendingObligations(userId, saved);

    return { cycle: saved, hadSalaryAlready };
  }

  async updateAllocation(
    userId: string,
    dto: UpdateCycleAllocationDto,
  ): Promise<FinanceCycle> {
    const cycle = await this.getCurrent(userId);
    if (!cycle) {
      throw new BadRequestException('No open finance cycle');
    }
    if (cycle.cycleStatus === FinanceCycleStatus.CLOSED) {
      throw new BadRequestException('Cannot edit a closed cycle');
    }

    const sum =
      toNum(dto.fixedObligations) +
      toNum(dto.savingsTarget) +
      toNum(dto.spendingBudget);
    const net = toNum(cycle.netSalary);
    if (Math.abs(sum - net) > 0.01) {
      throw new BadRequestException(
        `Allocation must equal net salary (${net}). Current sum: ${sum}`,
      );
    }

    cycle.fixedObligations = dto.fixedObligations;
    cycle.savingsTarget = dto.savingsTarget;
    cycle.spendingBudget = dto.spendingBudget;
    return this.cyclesRepo.save(cycle);
  }

  getRemainingUnallocated(
    cycle: FinanceCycle,
    subBudgetTotal: number,
  ): number {
    return (
      toNum(cycle.netSalary) -
      toNum(cycle.fixedObligations) -
      toNum(cycle.savingsTarget) -
      subBudgetTotal
    );
  }

  async validateSubBudgets(
    userId: string,
    additionalAmount: number,
    excludeBudgetId?: string,
  ): Promise<void> {
    const cycle = await this.cyclesRepo.findOne({
      where: { createdBy: userId, cycleStatus: FinanceCycleStatus.OPEN },
    });
    if (!cycle) return;

    const budgets = await this.budgetsRepo.find({
      where: { createdBy: userId },
    });
    const inCycle = budgets.filter(
      (b) =>
        b.id !== excludeBudgetId &&
        b.periodStart >= cycle.startDate &&
        b.periodEnd <= cycle.endDate,
    );
    const subTotal =
      inCycle.reduce((s, b) => s + toNum(b.amount), 0) + additionalAmount;
    if (subTotal > toNum(cycle.spendingBudget)) {
      throw new BadRequestException(
        `Sub-budgets (${subTotal}) exceed spending budget (${cycle.spendingBudget})`,
      );
    }
    const remaining = this.getRemainingUnallocated(cycle, subTotal);
    if (remaining < -0.01) {
      throw new BadRequestException(
        `Budget allocation would make remaining unallocated negative (${remaining})`,
      );
    }
  }

  async getObligationSummary(userId: string, cycleId: string) {
    await this.markOverdueObligations(userId, cycleId);
    const today = format(new Date(), 'yyyy-MM-dd');
    const upcomingEnd = format(addDays(new Date(), 7), 'yyyy-MM-dd');

    const all = await this.pendingRepo.find({
      where: { createdBy: userId, cycleId },
      order: { dueDate: 'ASC' },
    });

    const upcoming = all.filter(
      (o) =>
        o.obligationStatus === PendingObligationStatus.PENDING &&
        o.dueDate >= today &&
        o.dueDate <= upcomingEnd,
    );
    const overdue = all.filter(
      (o) => o.obligationStatus === PendingObligationStatus.OVERDUE,
    );
    const paid = all.filter(
      (o) => o.obligationStatus === PendingObligationStatus.PAID,
    );

    return { upcoming, overdue, paid };
  }

  async markObligationPaid(
    userId: string,
    obligationId: string,
    transactionId: string,
  ): Promise<void> {
    const obligation = await this.pendingRepo.findOne({
      where: { id: obligationId, createdBy: userId },
    });
    if (!obligation) {
      throw new BadRequestException('Pending obligation not found');
    }
    obligation.obligationStatus = PendingObligationStatus.PAID;
    obligation.paidTransactionId = transactionId;
    await this.pendingRepo.save(obligation);
  }
}
