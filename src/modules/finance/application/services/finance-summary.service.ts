import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { differenceInCalendarDays, format } from 'date-fns';
import { DateRangeQueryDto } from '../../../../common/dto/date-range.dto';
import { resolveDateRange } from '../../../../common/utils/date-range.util';
import { FinanceAccount } from '../../domain/entities/account.entity';
import { FinanceBudget } from '../../domain/entities/budget.entity';
import { IncomeCategory } from '../../domain/entities/income-category.entity';
import { SavingsGoal } from '../../domain/entities/savings-goal.entity';
import { FinanceTransaction } from '../../domain/entities/transaction.entity';
import {
  ExpenseClassificationType,
  TransactionType,
} from '../../domain/enums/finance.enums';
import { UserSettings } from '../../../settings/domain/entities/user-settings.entity';
import { FinanceCycle } from '../../domain/entities/finance-cycle.entity';
import { FinanceCyclesService } from './finance-cycles.service';

function toNum(v: unknown): number {
  return Number(v ?? 0);
}

@Injectable()
export class FinanceSummaryService {
  constructor(
    @InjectRepository(FinanceAccount)
    private readonly accountsRepo: Repository<FinanceAccount>,
    @InjectRepository(FinanceTransaction)
    private readonly txRepo: Repository<FinanceTransaction>,
    @InjectRepository(FinanceBudget)
    private readonly budgetsRepo: Repository<FinanceBudget>,
    @InjectRepository(SavingsGoal)
    private readonly savingsRepo: Repository<SavingsGoal>,
    @InjectRepository(IncomeCategory)
    private readonly incomeCatRepo: Repository<IncomeCategory>,
    @InjectRepository(FinanceCycle)
    private readonly cyclesRepo: Repository<FinanceCycle>,
    @InjectRepository(UserSettings)
    private readonly settingsRepo: Repository<UserSettings>,
    private readonly financeCycles: FinanceCyclesService,
  ) {}

  async getSummary(userId: string, query: DateRangeQueryDto) {
    const range = resolveDateRange(query.period, query.startDate, query.endDate);
    const between = Between(
      format(range.start, 'yyyy-MM-dd'),
      format(range.end, 'yyyy-MM-dd'),
    );

    const [accounts, transactions, budgets, savingsGoals, incomeCats] =
      await Promise.all([
        this.accountsRepo.find({ where: { createdBy: userId } }),
        this.txRepo.find({
          where: { createdBy: userId, transactionDate: between },
          relations: { expenseCategory: true },
          order: { transactionDate: 'ASC' },
        }),
        this.budgetsRepo.find({ where: { createdBy: userId } }),
        this.savingsRepo.find({ where: { createdBy: userId } }),
        this.incomeCatRepo.find({ where: { createdBy: userId } }),
      ]);

    let totalIncome = 0;
    let totalExpense = 0;
    let totalTransfer = 0;
    let totalVariableExpense = 0;
    let totalWastage = 0;

    const expenseByCategory = new Map<string, number>();
    const variableExpenseByCategory = new Map<string, number>();
    const incomeByCategory = new Map<string, number>();
    const dailyFlow = new Map<string, { income: number; expense: number }>();
    const expenseCatNames = new Map<string, string>();

    const isVariableExpenseTx = (tx: FinanceTransaction): boolean => {
      if (tx.transactionType !== TransactionType.EXPENSE) return false;
      if (!tx.categoryId) return true; // uncategorized -> treated as variable
      const cls = tx.expenseCategory?.classificationType;
      return (
        cls === ExpenseClassificationType.VARIABLE_NECESSITY ||
        cls === ExpenseClassificationType.DISCRETIONARY ||
        cls === undefined
      );
    };

    for (const tx of transactions) {
      const amount = toNum(tx.amount);
      const day = tx.transactionDate;
      const dayEntry = dailyFlow.get(day) ?? { income: 0, expense: 0 };

      if (tx.transactionType === TransactionType.INCOME) {
        totalIncome += amount;
        dayEntry.income += amount;
        const key = tx.categoryId ?? 'uncategorized';
        incomeByCategory.set(key, (incomeByCategory.get(key) ?? 0) + amount);
      } else if (tx.transactionType === TransactionType.EXPENSE) {
        totalExpense += amount;
        if (tx.isWastage) totalWastage += amount;
        if (isVariableExpenseTx(tx)) totalVariableExpense += amount;
        dayEntry.expense += amount;
        const key = tx.categoryId ?? 'uncategorized';
        if (tx.categoryId && tx.expenseCategory) {
          expenseCatNames.set(tx.categoryId, tx.expenseCategory.name);
        }
        expenseByCategory.set(key, (expenseByCategory.get(key) ?? 0) + amount);
        if (isVariableExpenseTx(tx)) {
          variableExpenseByCategory.set(
            key,
            (variableExpenseByCategory.get(key) ?? 0) + amount,
          );
        }
      } else {
        totalTransfer += amount;
      }
      dailyFlow.set(day, dayEntry);
    }

    const netWorth = accounts.reduce((s, a) => s + toNum(a.balance), 0);
    const netCashFlow = totalIncome - totalExpense;
    const savingsRate =
      totalIncome > 0 ? Math.round((netCashFlow / totalIncome) * 1000) / 10 : 0;

    const today = new Date();
    const elapsedEnd = today < range.end ? today : range.end;
    const daysElapsed = Math.max(
      1,
      differenceInCalendarDays(elapsedEnd, range.start) + 1,
    );
    const daysInPeriod = Math.max(
      1,
      differenceInCalendarDays(range.end, range.start) + 1,
    );
    const remainingDaysInCycle = Math.max(0, daysInPeriod - daysElapsed);

    // Burn rate + forecast should operate only on variable spending (not fixed obligations, not savings transfers).
    const burnRate =
      totalVariableExpense > 0
        ? Math.round((totalVariableExpense / daysElapsed) * 100) / 100
        : 0;
    const forecastEndOfMonthExpense =
      Math.round(
        (totalVariableExpense + burnRate * remainingDaysInCycle) * 100,
      ) / 100;
    const forecastEndOfMonthNet =
      Math.round((totalIncome - forecastEndOfMonthExpense) * 100) / 100;

    const totalSavingsTarget = savingsGoals.reduce(
      (s, g) => s + toNum(g.targetAmount),
      0,
    );
    const totalSavingsCurrent = savingsGoals.reduce(
      (s, g) => s + toNum(g.currentAmount),
      0,
    );

    const catName = (id: string, type: 'income' | 'expense') => {
      if (id === 'uncategorized') return 'Uncategorized';
      if (type === 'expense') return expenseCatNames.get(id) ?? 'Unknown';
      return incomeCats.find((c) => c.id === id)?.name ?? 'Unknown';
    };

    const currentCycle = await this.financeCycles.getCurrent(userId);
    const subBudgetTotal = budgets
      .filter(
        (b) =>
          currentCycle &&
          b.periodStart >= currentCycle.startDate &&
          b.periodEnd <= currentCycle.endDate,
      )
      .reduce((s, b) => s + toNum(b.amount), 0);
    const remainingUnallocated = currentCycle
      ? this.financeCycles.getRemainingUnallocated(currentCycle, subBudgetTotal)
      : 0;

    const obligations = currentCycle
      ? await this.financeCycles.getObligationSummary(userId, currentCycle.id)
      : { upcoming: [], overdue: [], paid: [] };

    const settings = await this.settingsRepo.findOne({
      where: { createdBy: userId },
    });
    const yearStart = `${new Date().getFullYear()}-01-01`;
    const yearEnd = `${new Date().getFullYear()}-12-31`;
    const yearTransfers = await this.txRepo.find({
      where: {
        createdBy: userId,
        transactionType: TransactionType.TRANSFER,
        transactionDate: Between(yearStart, yearEnd),
      },
    });
    const annualSavingsProgress = yearTransfers
      .filter((tx) => tx.savingsGoalId)
      .reduce((s, tx) => s + toNum(tx.amount), 0);

    return {
      period: query,
      range: { start: range.start.toISOString(), end: range.end.toISOString() },
      totals: {
        netWorth,
        totalIncome,
        totalExpense,
        totalTransfer,
        netCashFlow,
        savingsRate,
        totalSavingsTarget,
        totalSavingsCurrent,
        accountCount: accounts.length,
        transactionCount: transactions.length,
        burnRate,
        forecastEndOfMonthExpense,
        forecastEndOfMonthNet,
        totalWastage,
      },
      annualPlan: settings?.annualSavingsTarget
        ? {
            targetAmount: toNum(settings.annualSavingsTarget),
            currentProgress: annualSavingsProgress,
            progressPercent:
              toNum(settings.annualSavingsTarget) > 0
                ? Math.round(
                    (annualSavingsProgress /
                      toNum(settings.annualSavingsTarget)) *
                      1000,
                  ) / 10
                : 0,
            year: new Date().getFullYear(),
          }
        : null,
      financeOnboardingCompleted: settings?.financeOnboardingCompleted ?? false,
      budgets: budgets.map((b) => {
        const amount = toNum(b.amount);
        const spent = toNum(b.spent);
        const remaining = Math.max(0, amount - spent);
        const percentUsed = amount > 0 ? Math.round((spent / amount) * 1000) / 10 : 0;
        return {
          id: b.id,
          name: b.name,
          amount,
          spent,
          remaining,
          percentUsed,
          periodStart: b.periodStart,
          periodEnd: b.periodEnd,
          categoryId: b.categoryId,
        };
      }),
      savingsGoals: savingsGoals.map((g) => {
        const target = toNum(g.targetAmount);
        const current = toNum(g.currentAmount);
        const monthly = toNum(g.monthlyTargetAmount);
        const progressPercent =
          target > 0 ? Math.round((current / target) * 1000) / 10 : 0;
        const remaining = Math.max(0, target - current);
        const projectedCompletionDate =
          monthly > 0 && remaining > 0
            ? (() => {
                const carry = toNum(g.savingsShortfallCarryForward);
                const effective = monthly + carry;
                const d = new Date();
                d.setMonth(
                  d.getMonth() + Math.ceil(remaining / effective),
                );
                return d.toISOString().slice(0, 10);
              })()
            : undefined;
        return {
          id: g.id,
          name: g.name,
          targetAmount: target,
          currentAmount: current,
          monthlyTargetAmount: monthly,
          savingsShortfallCarryForward: toNum(g.savingsShortfallCarryForward),
          remaining,
          progressPercent,
          targetDate: g.targetDate,
          projectedCompletionDate,
        };
      }),
      currentCycle: currentCycle
        ? {
            id: currentCycle.id,
            startDate: currentCycle.startDate,
            endDate: currentCycle.endDate,
            status: currentCycle.cycleStatus,
            grossSalary: toNum(currentCycle.grossSalary),
            netSalary: toNum(currentCycle.netSalary),
            fixedObligations: toNum(currentCycle.fixedObligations),
            savingsTarget: toNum(currentCycle.savingsTarget),
            spendingBudget: toNum(currentCycle.spendingBudget),
            totalFixedObligations: toNum(currentCycle.totalFixedObligations),
            totalSavingsAllocated: toNum(currentCycle.totalSavingsAllocated),
            totalVariableSpent: toNum(currentCycle.totalVariableSpent),
            remainingBalance: toNum(currentCycle.remainingBalance),
            savingsShortfall: toNum(currentCycle.savingsShortfall),
            financialHealthScore: currentCycle.financialHealthScore,
            remainingUnallocated,
          }
        : null,
      obligations: {
        upcoming: obligations.upcoming.map((o) => ({
          id: o.id,
          name: o.name,
          expectedAmount: toNum(o.expectedAmount),
          dueDate: o.dueDate,
          status: o.obligationStatus,
        })),
        overdue: obligations.overdue.map((o) => ({
          id: o.id,
          name: o.name,
          expectedAmount: toNum(o.expectedAmount),
          dueDate: o.dueDate,
          status: o.obligationStatus,
        })),
        paidThisCycle: obligations.paid.map((o) => ({
          id: o.id,
          name: o.name,
          expectedAmount: toNum(o.expectedAmount),
          dueDate: o.dueDate,
          status: o.obligationStatus,
        })),
      },
      expenseByCategory: [...expenseByCategory.entries()].map(([id, amount]) => ({
        categoryId: id,
        name: catName(id, 'expense'),
        amount,
      })),
      variableExpenseByCategory: [...variableExpenseByCategory.entries()].map(
        ([id, amount]) => ({
          categoryId: id,
          name: catName(id, 'expense'),
          amount,
        }),
      ),
      incomeByCategory: [...incomeByCategory.entries()].map(([id, amount]) => ({
        categoryId: id,
        name: catName(id, 'income'),
        amount,
      })),
      dailyCashFlow: [...dailyFlow.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          date,
          income: v.income,
          expense: v.expense,
          net: v.income - v.expense,
        })),
    };
  }
}
