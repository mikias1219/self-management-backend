import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format } from 'date-fns';
import { Between, Repository } from 'typeorm';
import { DateRangeQueryDto } from '../../../../common/dto/date-range.dto';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { resolveDateRange } from '../../../../common/utils/date-range.util';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { FinanceAccount } from '../../domain/entities/account.entity';
import { SavingsGoal } from '../../domain/entities/savings-goal.entity';
import { FinanceTransaction } from '../../domain/entities/transaction.entity';
import { TransactionType } from '../../domain/enums/finance.enums';
import { BudgetsService } from './budgets.service';

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
    return -n;
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

  override async create(
    dto: Partial<FinanceTransaction>,
    userId: string,
  ): Promise<FinanceTransaction> {
    this.validateSavingsTransfer(dto);
    const saved = await super.create(dto, userId);
    const delta = this.balanceDelta(saved.transactionType, toNum(saved.amount));
    await this.applyBalance(saved.accountId, userId, delta);
    if (saved.savingsGoalId) {
      await this.applySavingsGoalDelta(userId, saved.savingsGoalId, toNum(saved.amount));
    }
    await this.budgetsService.syncSpentForUser(userId);
    return saved;
  }

  override async update(
    id: string,
    dto: Partial<FinanceTransaction>,
    userId: string,
  ): Promise<FinanceTransaction> {
    const existing = await this.findOneForUser(userId, id);
    this.validateSavingsTransfer({ ...existing, ...dto });
    const oldDelta = this.balanceDelta(
      existing.transactionType,
      toNum(existing.amount),
    );
    await this.applyBalance(existing.accountId, userId, -oldDelta);
    if (existing.savingsGoalId) {
      await this.applySavingsGoalDelta(userId, existing.savingsGoalId, -toNum(existing.amount));
    }

    const saved = await super.update(id, dto, userId);

    const newDelta = this.balanceDelta(
      saved.transactionType,
      toNum(saved.amount),
    );
    await this.applyBalance(saved.accountId, userId, newDelta);
    if (saved.savingsGoalId) {
      await this.applySavingsGoalDelta(userId, saved.savingsGoalId, toNum(saved.amount));
    }
    await this.budgetsService.syncSpentForUser(userId);
    return saved;
  }

  override async remove(id: string, userId: string): Promise<void> {
    const existing = await this.findOneForUser(userId, id);
    const delta = this.balanceDelta(
      existing.transactionType,
      toNum(existing.amount),
    );
    await this.applyBalance(existing.accountId, userId, -delta);
    if (existing.savingsGoalId) {
      await this.applySavingsGoalDelta(userId, existing.savingsGoalId, -toNum(existing.amount));
    }
    await super.remove(id, userId);
    await this.budgetsService.syncSpentForUser(userId);
  }
}
