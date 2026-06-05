import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DeepPartial, Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { FinanceBudget } from '../../domain/entities/budget.entity';
import { FinanceTransaction } from '../../domain/entities/transaction.entity';
import {
  ExpenseClassificationType,
  TransactionType,
} from '../../domain/enums/finance.enums';
import { FinanceCyclesService } from './finance-cycles.service';

function toNum(v: unknown): number {
  return Number(v ?? 0);
}

type TxBudgetSlice = Pick<
  FinanceTransaction,
  'transactionType' | 'transactionDate' | 'categoryId'
>;

@Injectable()
export class BudgetsService extends BaseCrudService<FinanceBudget> {
  constructor(
    @InjectRepository(FinanceBudget)
    repository: Repository<FinanceBudget>,
    @InjectRepository(FinanceTransaction)
    private readonly txRepo: Repository<FinanceTransaction>,
    @Inject(forwardRef(() => FinanceCyclesService))
    private readonly financeCycles: FinanceCyclesService,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.FINANCE,
      entityType: 'FinanceBudget',
    });
  }

  override async create(
    dto: DeepPartial<FinanceBudget>,
    userId: string,
  ): Promise<FinanceBudget> {
    await this.financeCycles.validateSubBudgets(userId, toNum(dto.amount));
    return super.create(dto, userId);
  }

  override async update(
    id: string,
    dto: DeepPartial<FinanceBudget>,
    userId: string,
  ): Promise<FinanceBudget> {
    const existing = await this.findOneForUser(userId, id);
    const newAmount =
      dto.amount !== undefined ? toNum(dto.amount) : toNum(existing.amount);
    await this.financeCycles.validateSubBudgets(userId, newAmount, id);
    return super.update(id, dto, userId);
  }

  private expenseCountsTowardBudget(
    tx: FinanceTransaction,
    budget: FinanceBudget,
  ): boolean {
    if (tx.transactionDate < budget.periodStart) return false;
    if (tx.transactionDate > budget.periodEnd) return false;
    if (budget.categoryId && tx.categoryId !== budget.categoryId) return false;

    const cls = tx.expenseCategory?.classificationType;
    if (cls === ExpenseClassificationType.FIXED_OBLIGATION) return false;
    if (cls === ExpenseClassificationType.SAVINGS_TRANSFER) return false;

    return true;
  }

  /** Recalculate `spent` for a single budget from matching expense transactions. */
  async syncSpentForBudget(userId: string, budgetId: string): Promise<void> {
    const budget = await this.findOneForUser(userId, budgetId);
    const transactions = await this.txRepo.find({
      where: {
        createdBy: userId,
        transactionType: TransactionType.EXPENSE,
        transactionDate: Between(budget.periodStart, budget.periodEnd),
        ...(budget.categoryId ? { categoryId: budget.categoryId } : {}),
      },
      relations: { expenseCategory: true },
    });

    const spent = transactions
      .filter((tx) => this.expenseCountsTowardBudget(tx, budget))
      .reduce((s, tx) => s + toNum(tx.amount), 0);

    if (toNum(budget.spent) !== spent) {
      budget.spent = spent;
      await this.repository.save(budget);
    }
  }

  /** Update only budgets that could be affected by a transaction create/update/delete. */
  async syncSpentForTransactionChange(
    userId: string,
    current?: TxBudgetSlice | null,
    previous?: TxBudgetSlice | null,
  ): Promise<void> {
    const budgets = await this.findAllForUser(userId);
    const affectedIds = new Set<string>();

    const consider = (tx?: TxBudgetSlice | null) => {
      if (!tx || tx.transactionType !== TransactionType.EXPENSE) return;
      for (const budget of budgets) {
        if (
          tx.transactionDate >= budget.periodStart &&
          tx.transactionDate <= budget.periodEnd &&
          (!budget.categoryId || budget.categoryId === tx.categoryId)
        ) {
          affectedIds.add(budget.id);
        }
      }
    };

    consider(previous);
    consider(current);

    await Promise.all(
      [...affectedIds].map((id) => this.syncSpentForBudget(userId, id)),
    );
  }

  /** Full resync — use sparingly (e.g. data repair), not on every read. */
  async syncSpentForUser(userId: string): Promise<void> {
    const budgets = await this.findAllForUser(userId);
    await Promise.all(
      budgets.map((b) => this.syncSpentForBudget(userId, b.id)),
    );
  }
}
