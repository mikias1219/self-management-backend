/**
 * Reset finance data for the seed user with Mikiyas personal profile.
 * Run: npx ts-node -r tsconfig-paths/register scripts/reseed-personal-finance.ts
 */
import { config } from 'dotenv';
import { addMonths, format, subDays } from 'date-fns';
import dataSource from '../typeorm.config';
import { IncomeSource } from '../src/common/domain/enums/income-source.enum';
import { EntityStatus } from '../src/common/domain/enums/entity-status.enum';
import { FinanceAccount } from '../src/modules/finance/domain/entities/account.entity';
import { ExpenseCategory } from '../src/modules/finance/domain/entities/expense-category.entity';
import { FinanceBudget } from '../src/modules/finance/domain/entities/budget.entity';
import { FinanceCycle } from '../src/modules/finance/domain/entities/finance-cycle.entity';
import { IncomeCategory } from '../src/modules/finance/domain/entities/income-category.entity';
import { PendingObligation } from '../src/modules/finance/domain/entities/pending-obligation.entity';
import { RecurringObligation } from '../src/modules/finance/domain/entities/recurring-obligation.entity';
import { SavingsGoal } from '../src/modules/finance/domain/entities/savings-goal.entity';
import { FinanceTransaction } from '../src/modules/finance/domain/entities/transaction.entity';
import {
  AccountType,
  ExpenseClassificationType,
  FinanceCycleStatus,
  PendingObligationStatus,
  TransactionType,
} from '../src/modules/finance/domain/enums/finance.enums';
import { User } from '../src/modules/users/domain/entities/user.entity';
import { UserSettings } from '../src/modules/settings/domain/entities/user-settings.entity';

config();

const EMAIL = process.env.SEED_USER_EMAIL ?? 'mikiyasabate003@gmail.com';
const SALARY_ETB = 16_000;
const SALARY_DAY = 10;
const RENT_ETB = 7_500;
const OIL_ETB = 500;
const SAVINGS_ETB = 2_000;
const FOOD_ETB = 2_000;
const FRUIT_ETB = 500;
const FIXED_ETB = RENT_ETB + OIL_ETB;
const VARIABLE_BUDGETS = FOOD_ETB + FRUIT_ETB;
const OTHER_ETB = SALARY_ETB - FIXED_ETB - SAVINGS_ETB - VARIABLE_BUDGETS;

function cycleEndFromStart(start: Date, salaryDay: number): string {
  const nextMonth = addMonths(start, 1);
  const nextSalary = new Date(
    nextMonth.getFullYear(),
    nextMonth.getMonth(),
    salaryDay,
  );
  return format(subDays(nextSalary, 1), 'yyyy-MM-dd');
}

function nextCycleStart(salaryDay: number, today = new Date()): Date {
  const candidate = new Date(today.getFullYear(), today.getMonth(), salaryDay);
  if (candidate > today) return candidate;
  return addMonths(candidate, 1);
}

function dueDateInCycle(
  cycleStart: string,
  cycleEnd: string,
  dueDay: number,
): string {
  const start = new Date(cycleStart);
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

async function main() {
  await dataSource.initialize();
  const userRepo = dataSource.getRepository(User);
  const settingsRepo = dataSource.getRepository(UserSettings);

  const user = await userRepo.findOne({ where: { email: EMAIL } });
  if (!user) {
    console.error(`User not found: ${EMAIL}`);
    process.exit(1);
  }
  const userId = user.id;

  const tables = [
    'finance_pending_obligations',
    'finance_transactions',
    'finance_budgets',
    'finance_cycles',
    'finance_recurring_obligations',
    'finance_savings_goals',
    'finance_expense_categories',
    'finance_income_categories',
    'finance_accounts',
  ];

  for (const table of tables) {
    await dataSource.query(
      `DELETE FROM "${table}" WHERE "createdBy" = $1`,
      [userId],
    );
  }

  const today = new Date();
  const nextSalary = nextCycleStart(SALARY_DAY, today);
  const cycleStartStr = format(nextSalary, 'yyyy-MM-dd');
  const cycleEndStr = cycleEndFromStart(nextSalary, SALARY_DAY);
  const salaryAlreadyReceived = today.getDate() >= SALARY_DAY;

  const salaryAccount = await dataSource.getRepository(FinanceAccount).save({
    name: 'IE Salary',
    accountType: AccountType.CHECKING,
    balance: salaryAlreadyReceived ? SALARY_ETB : 0,
    currency: 'ETB',
    createdBy: userId,
    status: EntityStatus.ACTIVE,
  });

  const savingsAccount = await dataSource.getRepository(FinanceAccount).save({
    name: 'My Saving',
    accountType: AccountType.SAVINGS,
    balance: 0,
    currency: 'ETB',
    createdBy: userId,
    status: EntityStatus.ACTIVE,
  });

  await dataSource.getRepository(IncomeCategory).save({
    name: 'Salary',
    icon: 'payments',
    color: '#22c55e',
    createdBy: userId,
    status: EntityStatus.ACTIVE,
  });

  const rentCat = await dataSource.getRepository(ExpenseCategory).save({
    name: 'Rent',
    icon: 'home',
    color: '#ef4444',
    classificationType: ExpenseClassificationType.FIXED_OBLIGATION,
    dueDay: 1,
    expectedAmount: RENT_ETB,
    createdBy: userId,
    status: EntityStatus.ACTIVE,
  });

  const oilCat = await dataSource.getRepository(ExpenseCategory).save({
    name: 'Oil',
    icon: 'local_gas_station',
    color: '#f97316',
    classificationType: ExpenseClassificationType.FIXED_OBLIGATION,
    dueDay: 10,
    expectedAmount: OIL_ETB,
    createdBy: userId,
    status: EntityStatus.ACTIVE,
  });

  const foodCat = await dataSource.getRepository(ExpenseCategory).save({
    name: 'Food',
    icon: 'restaurant',
    color: '#eab308',
    classificationType: ExpenseClassificationType.VARIABLE_NECESSITY,
    createdBy: userId,
    status: EntityStatus.ACTIVE,
  });

  const fruitCat = await dataSource.getRepository(ExpenseCategory).save({
    name: 'Fruit',
    icon: 'nutrition',
    color: '#84cc16',
    classificationType: ExpenseClassificationType.VARIABLE_NECESSITY,
    createdBy: userId,
    status: EntityStatus.ACTIVE,
  });

  const otherCat = await dataSource.getRepository(ExpenseCategory).save({
    name: 'Other',
    icon: 'more_horiz',
    color: '#a855f7',
    classificationType: ExpenseClassificationType.DISCRETIONARY,
    createdBy: userId,
    status: EntityStatus.ACTIVE,
  });

  const rentRecurring = await dataSource
    .getRepository(RecurringObligation)
    .save({
      name: 'Rent',
      amount: RENT_ETB,
      dueDayOfMonth: 1,
      isActive: true,
      createdBy: userId,
      status: EntityStatus.ACTIVE,
    });

  const oilRecurring = await dataSource
    .getRepository(RecurringObligation)
    .save({
      name: 'Oil',
      amount: OIL_ETB,
      dueDayOfMonth: 10,
      isActive: true,
      createdBy: userId,
      status: EntityStatus.ACTIVE,
    });

  await dataSource.getRepository(SavingsGoal).save({
    name: 'My Saving',
    targetAmount: 24_000,
    currentAmount: 0,
    monthlyTargetAmount: SAVINGS_ETB,
    targetDate: `${today.getFullYear()}-12-31`,
    createdBy: userId,
    status: EntityStatus.ACTIVE,
  });

  const budgetRepo = dataSource.getRepository(FinanceBudget);
  await budgetRepo.save([
    {
      name: 'Food',
      amount: FOOD_ETB,
      spent: 0,
      periodStart: cycleStartStr,
      periodEnd: cycleEndStr,
      categoryId: foodCat.id,
      createdBy: userId,
      status: EntityStatus.ACTIVE,
    },
    {
      name: 'Fruit',
      amount: FRUIT_ETB,
      spent: 0,
      periodStart: cycleStartStr,
      periodEnd: cycleEndStr,
      categoryId: fruitCat.id,
      createdBy: userId,
      status: EntityStatus.ACTIVE,
    },
    {
      name: 'Other',
      amount: OTHER_ETB,
      spent: 0,
      periodStart: cycleStartStr,
      periodEnd: cycleEndStr,
      categoryId: otherCat.id,
      createdBy: userId,
      status: EntityStatus.ACTIVE,
    },
  ]);

  let settings = await settingsRepo.findOne({ where: { createdBy: userId } });
  if (!settings) {
    settings = settingsRepo.create({ createdBy: userId });
  }
  settings.salaryDay = SALARY_DAY;
  settings.financeOnboardingCompleted = true;
  settings.annualSavingsTarget = 24_000;
  settings.timezone = 'Africa/Addis_Ababa';
  settings.modulePreferences = {
    accentColor: 'teal',
    financeAdvancedCycleMode: true,
  };
  await settingsRepo.save(settings);

  if (salaryAlreadyReceived) {
    const cycle = await dataSource.getRepository(FinanceCycle).save({
      createdBy: userId,
      startDate: format(
        new Date(today.getFullYear(), today.getMonth(), SALARY_DAY),
        'yyyy-MM-dd',
      ),
      endDate: cycleEndFromStart(
        new Date(today.getFullYear(), today.getMonth(), SALARY_DAY),
        SALARY_DAY,
      ),
      cycleStatus: FinanceCycleStatus.OPEN,
      grossSalary: SALARY_ETB,
      netSalary: SALARY_ETB,
      fixedObligations: FIXED_ETB,
      savingsTarget: SAVINGS_ETB,
      spendingBudget: VARIABLE_BUDGETS + OTHER_ETB,
    });

    await dataSource.getRepository(FinanceTransaction).save({
      accountId: salaryAccount.id,
      transactionType: TransactionType.INCOME,
      amount: SALARY_ETB,
      grossAmount: SALARY_ETB,
      netAmount: SALARY_ETB,
      incomeSource: IncomeSource.SALARY,
      transactionDate: format(
        new Date(today.getFullYear(), today.getMonth(), SALARY_DAY),
        'yyyy-MM-dd',
      ),
      description: 'Monthly salary',
      cycleId: cycle.id,
      createdBy: userId,
      status: EntityStatus.ACTIVE,
    });

    const pendingRepo = dataSource.getRepository(PendingObligation);
    await pendingRepo.save([
      {
        createdBy: userId,
        cycleId: cycle.id,
        recurringObligationId: rentRecurring.id,
        categoryId: rentCat.id,
        name: 'Rent',
        expectedAmount: RENT_ETB,
        dueDate: dueDateInCycle(cycle.startDate, cycle.endDate, 1),
        obligationStatus: PendingObligationStatus.PENDING,
        status: EntityStatus.ACTIVE,
      },
      {
        createdBy: userId,
        cycleId: cycle.id,
        recurringObligationId: oilRecurring.id,
        categoryId: oilCat.id,
        name: 'Oil',
        expectedAmount: OIL_ETB,
        dueDate: dueDateInCycle(cycle.startDate, cycle.endDate, 10),
        obligationStatus: PendingObligationStatus.PENDING,
        status: EntityStatus.ACTIVE,
      },
    ]);
  }

  console.log(`✅ Finance reseeded for ${EMAIL}`);
  console.log(`   Salary day: ${SALARY_DAY} | Next cycle: ${cycleStartStr} → ${cycleEndStr}`);
  console.log(
    `   Plan: salary ${SALARY_ETB} | rent ${RENT_ETB} | oil ${OIL_ETB} | save ${SAVINGS_ETB} | food ${FOOD_ETB} | fruit ${FRUIT_ETB} | other ${OTHER_ETB}`,
  );
  console.log(`   Accounts: IE Salary (${salaryAccount.balance} ETB), My Saving (0 ETB)`);

  await dataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
