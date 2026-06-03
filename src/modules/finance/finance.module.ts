import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsService } from './application/services/accounts.service';
import { BudgetsService } from './application/services/budgets.service';
import { ExpenseCategoriesService } from './application/services/expense-categories.service';
import { FinanceSummaryService } from './application/services/finance-summary.service';
import { IncomeCategoriesService } from './application/services/income-categories.service';
import { SavingsGoalsService } from './application/services/savings-goals.service';
import { TransactionsService } from './application/services/transactions.service';
import { FinanceAccount } from './domain/entities/account.entity';
import { FinanceBudget } from './domain/entities/budget.entity';
import { ExpenseCategory } from './domain/entities/expense-category.entity';
import { IncomeCategory } from './domain/entities/income-category.entity';
import { SavingsGoal } from './domain/entities/savings-goal.entity';
import { FinanceTransaction } from './domain/entities/transaction.entity';
import { AccountsController } from './presentation/controllers/accounts.controller';
import { BudgetsController } from './presentation/controllers/budgets.controller';
import { ExpenseCategoriesController } from './presentation/controllers/expense-categories.controller';
import { IncomeCategoriesController } from './presentation/controllers/income-categories.controller';
import { SavingsGoalsController } from './presentation/controllers/savings-goals.controller';
import { FinanceSummaryController } from './presentation/controllers/finance-summary.controller';
import { TransactionsController } from './presentation/controllers/transactions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([
    FinanceAccount, FinanceTransaction, FinanceBudget, SavingsGoal, ExpenseCategory, IncomeCategory,
  ])],
  controllers: [
    AccountsController,
    TransactionsController,
    BudgetsController,
    SavingsGoalsController,
    ExpenseCategoriesController,
    IncomeCategoriesController,
    FinanceSummaryController,
  ],
  providers: [
    AccountsService,
    TransactionsService,
    BudgetsService,
    SavingsGoalsService,
    ExpenseCategoriesService,
    IncomeCategoriesService,
    FinanceSummaryService,
  ],
  exports: [
    AccountsService,
    TransactionsService,
    BudgetsService,
    SavingsGoalsService,
    ExpenseCategoriesService,
    IncomeCategoriesService,
    FinanceSummaryService,
  ],
})
export class FinanceModule {}
