import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceAccount } from '../../modules/finance/domain/entities/account.entity';
import { FinanceBudget } from '../../modules/finance/domain/entities/budget.entity';
import { ExpenseCategory } from '../../modules/finance/domain/entities/expense-category.entity';
import { FinanceCycle } from '../../modules/finance/domain/entities/finance-cycle.entity';
import { IncomeCategory } from '../../modules/finance/domain/entities/income-category.entity';
import { PendingObligation } from '../../modules/finance/domain/entities/pending-obligation.entity';
import { RecurringObligation } from '../../modules/finance/domain/entities/recurring-obligation.entity';
import { SavingsGoal } from '../../modules/finance/domain/entities/savings-goal.entity';
import { FinanceTransaction } from '../../modules/finance/domain/entities/transaction.entity';
import { Notification } from '../../modules/notifications/domain/entities/notification.entity';
import { UserSettings } from '../../modules/settings/domain/entities/user-settings.entity';
import { User } from '../../modules/users/domain/entities/user.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserSettings,
      FinanceAccount,
      FinanceTransaction,
      FinanceBudget,
      SavingsGoal,
      ExpenseCategory,
      IncomeCategory,
      RecurringObligation,
      FinanceCycle,
      PendingObligation,
      Notification,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
