import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { addMonths, format, subDays } from 'date-fns';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { IncomeSource } from '../../common/domain/enums/income-source.enum';
import { EntityStatus } from '../../common/domain/enums/entity-status.enum';
import { Notification } from '../../modules/notifications/domain/entities/notification.entity';
import { UserSettings } from '../../modules/settings/domain/entities/user-settings.entity';
import { FinanceAccount } from '../../modules/finance/domain/entities/account.entity';
import { ExpenseCategory } from '../../modules/finance/domain/entities/expense-category.entity';
import { FinanceBudget } from '../../modules/finance/domain/entities/budget.entity';
import { FinanceCycle } from '../../modules/finance/domain/entities/finance-cycle.entity';
import { IncomeCategory } from '../../modules/finance/domain/entities/income-category.entity';
import { PendingObligation } from '../../modules/finance/domain/entities/pending-obligation.entity';
import { RecurringObligation } from '../../modules/finance/domain/entities/recurring-obligation.entity';
import { SavingsGoal } from '../../modules/finance/domain/entities/savings-goal.entity';
import { FinanceTransaction } from '../../modules/finance/domain/entities/transaction.entity';
import {
  AccountType,
  ExpenseClassificationType,
  FinanceCycleStatus,
  PendingObligationStatus,
  TransactionType,
} from '../../modules/finance/domain/enums/finance.enums';
import { User } from '../../modules/users/domain/entities/user.entity';

const SALARY_ETB = 16_000;
const SALARY_DAY = 10;
const RENT_ETB = 7_500;
const OIL_ETB = 500;
const SAVINGS_ETB = 2_000;
const FOOD_ETB = 2_000;
const FRUIT_ETB = 500;
const FIXED_ETB = RENT_ETB + OIL_ETB;
const OTHER_ETB =
  SALARY_ETB - FIXED_ETB - SAVINGS_ETB - FOOD_ETB - FRUIT_ETB;

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(UserSettings) private readonly settingsRepo: Repository<UserSettings>,
    @InjectRepository(FinanceAccount) private readonly accountsRepo: Repository<FinanceAccount>,
    @InjectRepository(FinanceTransaction) private readonly transactionsRepo: Repository<FinanceTransaction>,
    @InjectRepository(FinanceBudget) private readonly budgetsRepo: Repository<FinanceBudget>,
    @InjectRepository(SavingsGoal) private readonly savingsGoalsRepo: Repository<SavingsGoal>,
    @InjectRepository(ExpenseCategory) private readonly expenseCategoriesRepo: Repository<ExpenseCategory>,
    @InjectRepository(IncomeCategory) private readonly incomeCategoriesRepo: Repository<IncomeCategory>,
    @InjectRepository(RecurringObligation) private readonly recurringRepo: Repository<RecurringObligation>,
    @InjectRepository(FinanceCycle) private readonly cyclesRepo: Repository<FinanceCycle>,
    @InjectRepository(PendingObligation) private readonly pendingRepo: Repository<PendingObligation>,
    @InjectRepository(Notification) private readonly notificationsRepo: Repository<Notification>,
  ) {}

  async onModuleInit() {
    if (!this.config.get<boolean>('seedOnStart')) return;
    await this.seed();
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

  private nextCycleStart(salaryDay: number, today = new Date()): Date {
    const candidate = new Date(today.getFullYear(), today.getMonth(), salaryDay);
    if (candidate > today) return candidate;
    return addMonths(candidate, 1);
  }

  private dueDateInCycle(
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

  async seed() {
    const email = this.config.get<string>('seedUser.email') ?? '';
    const password = this.config.get<string>('seedUser.password') ?? '';
    const displayName =
      this.config.get<string>('seedUser.displayName') ?? 'Mikiyas';

    if (!email || !password) {
      this.logger.warn(
        'SEED_USER_EMAIL / SEED_USER_PASSWORD not set — skipping seed',
      );
      return;
    }

    const existing = await this.usersRepo.findOne({ where: { email } });
    if (existing) {
      this.logger.log(`Seed user already exists (${email}), skipping seed`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.usersRepo.save(
      this.usersRepo.create({
        email,
        passwordHash,
        displayName,
        timezone: 'Africa/Addis_Ababa',
        primaryCurrency: 'ETB',
        status: EntityStatus.ACTIVE,
      }),
    );
    const userId = user.id;
    const today = new Date();
    const nextSalary = this.nextCycleStart(SALARY_DAY, today);
    const cycleStartStr = format(nextSalary, 'yyyy-MM-dd');
    const cycleEndStr = this.cycleEndFromStart(nextSalary, SALARY_DAY);
    const salaryAlreadyReceived = today.getDate() >= SALARY_DAY;

    await this.accountsRepo.save(
      this.accountsRepo.create({
        name: 'IE Salary',
        accountType: AccountType.CHECKING,
        balance: salaryAlreadyReceived ? SALARY_ETB : 0,
        currency: 'ETB',
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.accountsRepo.save(
      this.accountsRepo.create({
        name: 'My Saving',
        accountType: AccountType.SAVINGS,
        balance: 0,
        currency: 'ETB',
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.incomeCategoriesRepo.save(
      this.incomeCategoriesRepo.create({
        name: 'Salary',
        icon: 'payments',
        color: '#22c55e',
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    const rentCat = await this.expenseCategoriesRepo.save(
      this.expenseCategoriesRepo.create({
        name: 'Rent',
        icon: 'home',
        color: '#ef4444',
        classificationType: ExpenseClassificationType.FIXED_OBLIGATION,
        dueDay: 1,
        expectedAmount: RENT_ETB,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    const oilCat = await this.expenseCategoriesRepo.save(
      this.expenseCategoriesRepo.create({
        name: 'Oil',
        icon: 'local_gas_station',
        color: '#f97316',
        classificationType: ExpenseClassificationType.FIXED_OBLIGATION,
        dueDay: 10,
        expectedAmount: OIL_ETB,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    const foodCat = await this.expenseCategoriesRepo.save(
      this.expenseCategoriesRepo.create({
        name: 'Food',
        icon: 'restaurant',
        color: '#eab308',
        classificationType: ExpenseClassificationType.VARIABLE_NECESSITY,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    const fruitCat = await this.expenseCategoriesRepo.save(
      this.expenseCategoriesRepo.create({
        name: 'Fruit',
        icon: 'nutrition',
        color: '#84cc16',
        classificationType: ExpenseClassificationType.VARIABLE_NECESSITY,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    const otherCat = await this.expenseCategoriesRepo.save(
      this.expenseCategoriesRepo.create({
        name: 'Other',
        icon: 'more_horiz',
        color: '#a855f7',
        classificationType: ExpenseClassificationType.DISCRETIONARY,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    const rentRecurring = await this.recurringRepo.save(
      this.recurringRepo.create({
        name: 'Rent',
        amount: RENT_ETB,
        dueDayOfMonth: 1,
        isActive: true,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    const oilRecurring = await this.recurringRepo.save(
      this.recurringRepo.create({
        name: 'Oil',
        amount: OIL_ETB,
        dueDayOfMonth: 10,
        isActive: true,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.budgetsRepo.save([
      this.budgetsRepo.create({
        name: 'Food',
        amount: FOOD_ETB,
        spent: 0,
        periodStart: cycleStartStr,
        periodEnd: cycleEndStr,
        categoryId: foodCat.id,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
      this.budgetsRepo.create({
        name: 'Fruit',
        amount: FRUIT_ETB,
        spent: 0,
        periodStart: cycleStartStr,
        periodEnd: cycleEndStr,
        categoryId: fruitCat.id,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
      this.budgetsRepo.create({
        name: 'Other',
        amount: OTHER_ETB,
        spent: 0,
        periodStart: cycleStartStr,
        periodEnd: cycleEndStr,
        categoryId: otherCat.id,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    ]);

    await this.savingsGoalsRepo.save(
      this.savingsGoalsRepo.create({
        name: 'My Saving',
        targetAmount: 24_000,
        currentAmount: 0,
        monthlyTargetAmount: SAVINGS_ETB,
        targetDate: `${today.getFullYear()}-12-31`,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.settingsRepo.save(
      this.settingsRepo.create({
        timezone: 'Africa/Addis_Ababa',
        locale: 'en',
        theme: 'system',
        salaryDay: SALARY_DAY,
        annualSavingsTarget: 24_000,
        financeOnboardingCompleted: true,
        modulePreferences: {
          accentColor: 'teal',
          financeAdvancedCycleMode: true,
        },
        notificationPreferences: { email: true, push: false },
        integrations: {
          calendarFeed: {
            embedSrc:
              this.config.get<string>('calendar.defaultEmbedSrc') || email,
            icalFeedUrl:
              this.config.get<string>('calendar.defaultIcalUrl') || undefined,
            timezone:
              this.config.get<string>('calendar.defaultTimezone') ??
              'Africa/Addis_Ababa',
          },
        },
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    if (salaryAlreadyReceived) {
      const salaryAccount = await this.accountsRepo.findOne({
        where: { createdBy: userId, name: 'IE Salary' },
      });
      const cycle = await this.cyclesRepo.save(
        this.cyclesRepo.create({
          createdBy: userId,
          startDate: format(
            new Date(today.getFullYear(), today.getMonth(), SALARY_DAY),
            'yyyy-MM-dd',
          ),
          endDate: this.cycleEndFromStart(
            new Date(today.getFullYear(), today.getMonth(), SALARY_DAY),
            SALARY_DAY,
          ),
          cycleStatus: FinanceCycleStatus.OPEN,
          grossSalary: SALARY_ETB,
          netSalary: SALARY_ETB,
          fixedObligations: FIXED_ETB,
          savingsTarget: SAVINGS_ETB,
          spendingBudget: FOOD_ETB + FRUIT_ETB + OTHER_ETB,
        }),
      );

      if (salaryAccount) {
        await this.transactionsRepo.save(
          this.transactionsRepo.create({
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
          }),
        );
      }

      await this.pendingRepo.save([
        this.pendingRepo.create({
          createdBy: userId,
          cycleId: cycle.id,
          recurringObligationId: rentRecurring.id,
          categoryId: rentCat.id,
          name: 'Rent',
          expectedAmount: RENT_ETB,
          dueDate: this.dueDateInCycle(cycle.startDate, cycle.endDate, 1),
          obligationStatus: PendingObligationStatus.PENDING,
          status: EntityStatus.ACTIVE,
        }),
        this.pendingRepo.create({
          createdBy: userId,
          cycleId: cycle.id,
          recurringObligationId: oilRecurring.id,
          categoryId: oilCat.id,
          name: 'Oil',
          expectedAmount: OIL_ETB,
          dueDate: this.dueDateInCycle(cycle.startDate, cycle.endDate, 10),
          obligationStatus: PendingObligationStatus.PENDING,
          status: EntityStatus.ACTIVE,
        }),
      ]);
    }

    await this.notificationsRepo.save(
      this.notificationsRepo.create({
        title: 'Welcome to LifeOS',
        message:
          'Your finance plan is ready. Log salary on the 10th, then track expenses against Food, Fruit, and Other.',
        isRead: false,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    this.logger.log(
      `Seeded ${email}: salary ${SALARY_ETB} ETB on day ${SALARY_DAY}`,
    );
  }
}
