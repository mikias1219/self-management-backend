import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { FinanceBudget } from '../../domain/entities/budget.entity';
import { ExpenseCategory } from '../../domain/entities/expense-category.entity';
import { FinanceTransaction } from '../../domain/entities/transaction.entity';
import { ExpenseClassificationType, TransactionType } from '../../domain/enums/finance.enums';

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
    @InjectRepository(ExpenseCategory)
    private readonly expenseCatRepo: Repository<ExpenseCategory>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.FINANCE,
      entityType: 'FinanceBudget',
    });
  }

  /** Recalculate `spent` from expense transactions within each budget period. */
  async syncSpentForUser(userId: string): Promise<void> {
    const [budgets, transactions, expenseCats] = await Promise.all([
      this.findAllForUser(userId),
      this.txRepo.find({
        where: { createdBy: userId, transactionType: TransactionType.EXPENSE },
      }),
      this.expenseCatRepo.find({ where: { createdBy: userId } }),
    ]);

    const classificationByCategoryId = new Map(
      expenseCats.map((c) => [c.id, c.classificationType]),
    );

    for (const budget of budgets) {
      const spent = transactions
        .filter((tx) => {
          if (tx.transactionDate < budget.periodStart) return false;
          if (tx.transactionDate > budget.periodEnd) return false;
          if (budget.categoryId && tx.categoryId !== budget.categoryId) {
            return false;
          }

          // Budget spend must only include VARIABLE_NECESSITY + DISCRETIONARY.
          // If uncategorized, we treat it as variable by default.
          const cls = tx.categoryId
            ? classificationByCategoryId.get(tx.categoryId)
            : undefined;
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
