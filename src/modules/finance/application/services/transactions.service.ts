import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format } from 'date-fns';
import { Between, Repository } from 'typeorm';
import { DateRangeQueryDto } from '../../../../common/dto/date-range.dto';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { resolveDateRange } from '../../../../common/utils/date-range.util';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { IncomeSource } from '../../../../common/domain/enums/income-source.enum';
import { FinanceAccount } from '../../domain/entities/account.entity';
import { SavingsGoal } from '../../domain/entities/savings-goal.entity';
import { FinanceTransaction } from '../../domain/entities/transaction.entity';
import { AccountType, TransactionType } from '../../domain/enums/finance.enums';
import { BudgetsService } from './budgets.service';
import { FinanceCyclesService } from './finance-cycles.service';

function toNum(v: unknown): number {
  return Number(v ?? 0);
}

@Injectable()
export class TransactionsService extends BaseCrudService<FinanceTransaction> {
  constructor(
    @InjectRepository(FinanceTransaction)
    repository: Repository<FinanceTransaction>,
    @InjectRepository(FinanceAccount)
    private readonly accountsRepo: Repository<FinanceAccount>,
    @InjectRepository(SavingsGoal)
    private readonly savingsRepo: Repository<SavingsGoal>,
    private readonly financeCycles: FinanceCyclesService,
    private readonly budgetsService: BudgetsService,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.FINANCE,
      entityType: 'FinanceTransaction',
    });
  }

  balanceDelta(type: TransactionType, amount: number): number {
    const n = toNum(amount);
    if (type === TransactionType.INCOME) return n;
    if (type === TransactionType.EXPENSE) return -n;
    return 0; // transfers are handled as debit+credit with toAccountId
  }

  private async applyBalance(
    accountId: string,
    userId: string,
    delta: number,
  ): Promise<void> {
    const account = await this.accountsRepo.findOne({
      where: { id: accountId, createdBy: userId },
    });
    if (!account) {
      throw new BadRequestException('Account not found');
    }
    account.balance = toNum(account.balance) + delta;
    await this.accountsRepo.save(account);
  }

  private async applySavingsGoalDelta(
    userId: string,
    savingsGoalId: string,
    delta: number,
  ): Promise<void> {
    const goal = await this.savingsRepo.findOne({
      where: { id: savingsGoalId, createdBy: userId },
    });
    if (!goal) {
      throw new BadRequestException('Savings goal not found');
    }
    goal.currentAmount = toNum(goal.currentAmount) + toNum(delta);
    if (toNum(goal.currentAmount) < 0) goal.currentAmount = 0;
    await this.savingsRepo.save(goal);
  }

  private validateSavingsTransfer(txLike: Partial<FinanceTransaction>) {
    if (!txLike.savingsGoalId) return;
    if (txLike.transactionType !== TransactionType.TRANSFER) {
      throw new BadRequestException(
        'savingsGoalId is only allowed for transfer transactions',
      );
    }
    if (toNum(txLike.amount) <= 0) {
      throw new BadRequestException('Savings transfers must have amount > 0');
    }
    if (!txLike.toAccountId) {
      throw new BadRequestException(
        'Savings transfers require toAccountId (destination savings account)',
      );
    }
  }

  private async validateTransferAccounts(
    userId: string,
    txLike: Partial<FinanceTransaction>,
  ): Promise<void> {
    if (txLike.transactionType !== TransactionType.TRANSFER) return;
    if (!txLike.toAccountId) {
      throw new BadRequestException('Transfers require toAccountId');
    }
    if (txLike.toAccountId === txLike.accountId) {
      throw new BadRequestException('Transfer accounts must be different');
    }

    if (txLike.savingsGoalId) {
      const dest = await this.accountsRepo.findOne({
        where: { id: txLike.toAccountId, createdBy: userId },
      });
      if (!dest) throw new BadRequestException('Destination account not found');
      if (dest.accountType !== AccountType.SAVINGS) {
        throw new BadRequestException(
          'Savings transfers must go to a savings account',
        );
      }
    }
  }

  async findAllForUserInPeriod(
    userId: string,
    query?: DateRangeQueryDto,
  ): Promise<FinanceTransaction[]> {
    if (!query?.period && !query?.startDate) {
      return this.findAllForUser(userId);
    }
    const range = resolveDateRange(query.period, query.startDate, query.endDate);
    return this.repository.find({
      where: {
        createdBy: userId,
        transactionDate: Between(
          format(range.start, 'yyyy-MM-dd'),
          format(range.end, 'yyyy-MM-dd'),
        ),
      },
      order: { transactionDate: 'DESC', createdAt: 'DESC' },
    });
  }

  private normalizeSalaryFields(
    dto: Partial<FinanceTransaction>,
  ): Partial<FinanceTransaction> {
    if (
      dto.transactionType !== TransactionType.INCOME ||
      dto.incomeSource !== IncomeSource.SALARY
    ) {
      return dto;
    }
    const gross = toNum(dto.grossAmount ?? dto.amount);
    const tax = toNum(dto.taxDeducted);
    const pension = toNum(dto.pensionDeducted);
    const net =
      dto.netAmount !== undefined && dto.netAmount !== null
        ? toNum(dto.netAmount)
        : gross - tax - pension;
    return {
      ...dto,
      grossAmount: gross,
      taxDeducted: tax,
      pensionDeducted: pension,
      netAmount: net,
      amount: net,
    };
  }

  override async create(
    dto: Partial<FinanceTransaction>,
    userId: string,
  ): Promise<FinanceTransaction> {
    const normalized = this.normalizeSalaryFields(dto);
    this.validateSavingsTransfer(normalized);
    await this.validateTransferAccounts(userId, normalized);

    const currentCycle = await this.financeCycles.findOpenCycle(userId);
    if (currentCycle && !normalized.isCorrection) {
      normalized.cycleId = currentCycle.id;
    }

    const saved = await super.create(normalized, userId);

    if (saved.transactionType === TransactionType.TRANSFER) {
      await this.applyBalance(saved.accountId, userId, -toNum(saved.amount));
      await this.applyBalance(saved.toAccountId!, userId, toNum(saved.amount));
    } else {
      const delta = this.balanceDelta(saved.transactionType, toNum(saved.amount));
      await this.applyBalance(saved.accountId, userId, delta);
    }

    if (saved.savingsGoalId) {
      await this.applySavingsGoalDelta(
        userId,
        saved.savingsGoalId,
        toNum(saved.amount),
      );
    }

    if (saved.pendingObligationId) {
      await this.financeCycles.markObligationPaid(
        userId,
        saved.pendingObligationId,
        saved.id,
      );
    }

    let cycleToRefresh = currentCycle;
    if (
      saved.transactionType === TransactionType.INCOME &&
      saved.incomeSource === IncomeSource.SALARY
    ) {
      const { cycle, hadSalaryAlready } =
        await this.financeCycles.openFromSalaryTx(userId, saved, {
          gross: toNum(saved.grossAmount),
          net: toNum(saved.netAmount ?? saved.amount),
        });
      cycleToRefresh = cycle;
      if (hadSalaryAlready && !dto.needsReview) {
        saved.needsReview = true;
        await this.repository.save(saved);
      }
    }

    if (cycleToRefresh) {
      await this.financeCycles.refreshCycleTotals(userId, cycleToRefresh);
    }

    await this.budgetsService.syncSpentForTransactionChange(userId, saved);
    return saved;
  }

  override async update(
    id: string,
    dto: Partial<FinanceTransaction>,
    userId: string,
  ): Promise<FinanceTransaction> {
    const existing = await this.findOneForUser(userId, id);
    this.validateSavingsTransfer({ ...existing, ...dto });
    await this.validateTransferAccounts(userId, { ...existing, ...dto });

    if (existing.transactionType === TransactionType.TRANSFER) {
      await this.applyBalance(existing.accountId, userId, toNum(existing.amount));
      if (existing.toAccountId) {
        await this.applyBalance(existing.toAccountId, userId, -toNum(existing.amount));
      }
    } else {
      const oldDelta = this.balanceDelta(
        existing.transactionType,
        toNum(existing.amount),
      );
      await this.applyBalance(existing.accountId, userId, -oldDelta);
    }
    if (existing.savingsGoalId) {
      await this.applySavingsGoalDelta(userId, existing.savingsGoalId, -toNum(existing.amount));
    }

    const saved = await super.update(id, dto, userId);

    if (saved.transactionType === TransactionType.TRANSFER) {
      await this.applyBalance(saved.accountId, userId, -toNum(saved.amount));
      await this.applyBalance(saved.toAccountId!, userId, toNum(saved.amount));
    } else {
      const newDelta = this.balanceDelta(
        saved.transactionType,
        toNum(saved.amount),
      );
      await this.applyBalance(saved.accountId, userId, newDelta);
    }
    if (saved.savingsGoalId) {
      await this.applySavingsGoalDelta(userId, saved.savingsGoalId, toNum(saved.amount));
    }
    if (
      saved.pendingObligationId &&
      saved.pendingObligationId !== existing.pendingObligationId
    ) {
      await this.financeCycles.markObligationPaid(
        userId,
        saved.pendingObligationId,
        saved.id,
      );
    }
    await this.budgetsService.syncSpentForTransactionChange(
      userId,
      saved,
      existing,
    );
    return saved;
  }

  override async remove(id: string, userId: string): Promise<void> {
    const existing = await this.findOneForUser(userId, id);
    if (existing.transactionType === TransactionType.TRANSFER) {
      await this.applyBalance(existing.accountId, userId, toNum(existing.amount));
      if (existing.toAccountId) {
        await this.applyBalance(existing.toAccountId, userId, -toNum(existing.amount));
      }
    } else {
      const delta = this.balanceDelta(
        existing.transactionType,
        toNum(existing.amount),
      );
      await this.applyBalance(existing.accountId, userId, -delta);
    }
    if (existing.savingsGoalId) {
      await this.applySavingsGoalDelta(userId, existing.savingsGoalId, -toNum(existing.amount));
    }
    await super.remove(id, userId);
    await this.budgetsService.syncSpentForTransactionChange(
      userId,
      null,
      existing,
    );
  }
}
