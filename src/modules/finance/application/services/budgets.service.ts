import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
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

  /** Recalculate `spent` from expense transactions within each budget period. */
  async syncSpentForUser(userId: string): Promise<void> {
    const [budgets, transactions] = await Promise.all([
      this.findAllForUser(userId),
      this.txRepo.find({
        where: { createdBy: userId, transactionType: TransactionType.EXPENSE },
        relations: { expenseCategory: true },
      }),
    ]);

    for (const budget of budgets) {
      const spent = transactions
        .filter((tx) => {
          if (tx.transactionDate < budget.periodStart) return false;
          if (tx.transactionDate > budget.periodEnd) return false;
          if (budget.categoryId && tx.categoryId !== budget.categoryId) {
            return false;
          }

          const cls = tx.expenseCategory?.classificationType;
          if (cls === ExpenseClassificationType.FIXED_OBLIGATION) return false;
          if (cls === ExpenseClassificationType.SAVINGS_TRANSFER) return false;

          return true;
        })
        .reduce((s, tx) => s + toNum(tx.amount), 0);

      if (toNum(budget.spent) !== spent) {
        budget.spent = spent;
        await this.repository.save(budget);
      }
    }
  }
}
