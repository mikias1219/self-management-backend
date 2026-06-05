import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { EntityStatus } from '../../common/domain/enums/entity-status.enum';
import { AiCoachSession } from '../../modules/ai-coach/domain/entities/ai-coach-session.entity';
import { DailyReview } from '../../modules/daily-reviews/domain/entities/daily-review.entity';
import { EnglishPractice } from '../../modules/english/domain/entities/english-practice.entity';
import { EnglishPracticeType } from '../../modules/english/domain/enums/english.enums';
import { FinanceAccount } from '../../modules/finance/domain/entities/account.entity';
import { ExpenseCategory } from '../../modules/finance/domain/entities/expense-category.entity';
import { FinanceBudget } from '../../modules/finance/domain/entities/budget.entity';
import { IncomeCategory } from '../../modules/finance/domain/entities/income-category.entity';
import { SavingsGoal } from '../../modules/finance/domain/entities/savings-goal.entity';
import { FinanceTransaction } from '../../modules/finance/domain/entities/transaction.entity';
import {
  AccountType,
  TransactionType,
} from '../../modules/finance/domain/enums/finance.enums';
import { Goal } from '../../modules/goals/domain/entities/goal.entity';
import { GoalLevel } from '../../modules/goals/domain/enums/goal.enums';
import { HabitLog } from '../../modules/habits/domain/entities/habit-log.entity';
import { Habit } from '../../modules/habits/domain/entities/habit.entity';
import { HabitFrequency } from '../../modules/habits/domain/enums/habit.enums';
import { HealthLog } from '../../modules/health/domain/entities/health-log.entity';
import { HealthMetricType } from '../../modules/health/domain/enums/health.enums';
import { Book } from '../../modules/learning/domain/entities/book.entity';
import { Course } from '../../modules/learning/domain/entities/course.entity';
import { LearningProject } from '../../modules/learning/domain/entities/learning-project.entity';
import { Skill } from '../../modules/learning/domain/entities/skill.entity';
import { StudySession } from '../../modules/learning/domain/entities/study-session.entity';
import { LearningItemStatus } from '../../modules/learning/domain/enums/learning.enums';
import { JournalEntry } from '../../modules/journal/domain/entities/journal-entry.entity';
import { JournalEntryType } from '../../modules/journal/domain/enums/journal.enums';
import { Notification } from '../../modules/notifications/domain/entities/notification.entity';
import { UserSettings } from '../../modules/settings/domain/entities/user-settings.entity';
import { SpiritualActivity } from '../../modules/spiritual/domain/entities/spiritual-activity.entity';
import { SpiritualActivityType } from '../../modules/spiritual/domain/enums/spiritual.enums';
import { Task } from '../../modules/tasks/domain/entities/task.entity';
import { TaskPriority, TaskStatus } from '../../modules/tasks/domain/enums/task.enums';
import { User } from '../../modules/users/domain/entities/user.entity';

const DEMO_EMAIL = 'demo@lifeos.app';
const DEMO_PASSWORD = 'LifeOS2026!';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Task) private readonly tasksRepo: Repository<Task>,
    @InjectRepository(Goal) private readonly goalsRepo: Repository<Goal>,
    @InjectRepository(Habit) private readonly habitsRepo: Repository<Habit>,
    @InjectRepository(HabitLog) private readonly habitLogsRepo: Repository<HabitLog>,
    @InjectRepository(DailyReview) private readonly dailyReviewsRepo: Repository<DailyReview>,
    @InjectRepository(Skill) private readonly skillsRepo: Repository<Skill>,
    @InjectRepository(Course) private readonly coursesRepo: Repository<Course>,
    @InjectRepository(Book) private readonly booksRepo: Repository<Book>,
    @InjectRepository(LearningProject) private readonly projectsRepo: Repository<LearningProject>,
    @InjectRepository(StudySession) private readonly studySessionsRepo: Repository<StudySession>,
    @InjectRepository(FinanceAccount) private readonly accountsRepo: Repository<FinanceAccount>,
    @InjectRepository(FinanceTransaction) private readonly transactionsRepo: Repository<FinanceTransaction>,
    @InjectRepository(FinanceBudget) private readonly budgetsRepo: Repository<FinanceBudget>,
    @InjectRepository(SavingsGoal) private readonly savingsGoalsRepo: Repository<SavingsGoal>,
    @InjectRepository(ExpenseCategory) private readonly expenseCategoriesRepo: Repository<ExpenseCategory>,
    @InjectRepository(IncomeCategory) private readonly incomeCategoriesRepo: Repository<IncomeCategory>,
    @InjectRepository(EnglishPractice) private readonly englishRepo: Repository<EnglishPractice>,
    @InjectRepository(SpiritualActivity) private readonly spiritualRepo: Repository<SpiritualActivity>,
    @InjectRepository(HealthLog) private readonly healthRepo: Repository<HealthLog>,
    @InjectRepository(JournalEntry) private readonly journalRepo: Repository<JournalEntry>,
    @InjectRepository(Notification) private readonly notificationsRepo: Repository<Notification>,
    @InjectRepository(UserSettings) private readonly settingsRepo: Repository<UserSettings>,
    @InjectRepository(AiCoachSession) private readonly aiCoachRepo: Repository<AiCoachSession>,
  ) {}

  async onModuleInit() {
    if (!this.config.get<boolean>('seedOnStart')) return;
    await this.seed();
  }

  async seed() {
    const existing = await this.usersRepo.findOne({ where: { email: DEMO_EMAIL } });
    if (existing) {
      this.logger.log('Demo user already exists, skipping seed');
      return;
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const user = await this.usersRepo.save(
      this.usersRepo.create({
        email: DEMO_EMAIL,
        passwordHash,
        displayName: 'Demo User',
        timezone: 'UTC',
        status: EntityStatus.ACTIVE,
      }),
    );
    const userId = user.id;
    const today = new Date().toISOString().slice(0, 10);

    const yearlyGoal = await this.goalsRepo.save(
      this.goalsRepo.create({
        title: 'Build LifeOS mastery',
        level: GoalLevel.YEARLY,
        progress: 25,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.tasksRepo.save([
      this.tasksRepo.create({
        title: 'Review daily goals',
        priority: TaskPriority.HIGH,
        taskStatus: TaskStatus.TODO,
        dueDate: new Date(),
        goalId: yearlyGoal.id,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
      this.tasksRepo.create({
        title: 'Complete morning routine',
        priority: TaskPriority.MEDIUM,
        taskStatus: TaskStatus.DONE,
        completedAt: new Date(),
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    ]);

    const habit = await this.habitsRepo.save(
      this.habitsRepo.create({
        name: 'Morning meditation',
        frequency: HabitFrequency.DAILY,
        currentStreak: 3,
        bestStreak: 7,
        color: '#4CAF50',
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.habitLogsRepo.save(
      this.habitLogsRepo.create({
        habitId: habit.id,
        completedAt: new Date(),
        notes: 'Felt focused',
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.dailyReviewsRepo.save(
      this.dailyReviewsRepo.create({
        reviewDate: today,
        wins: 'Completed key tasks',
        challenges: 'Time management',
        lessons: 'Plan the night before',
        moodScore: 8,
        productivityScore: 7,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    const skill = await this.skillsRepo.save(
      this.skillsRepo.create({
        name: 'TypeScript',
        proficiency: 70,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    const course = await this.coursesRepo.save(
      this.coursesRepo.create({
        title: 'Advanced NestJS',
        platform: 'Udemy',
        learningStatus: LearningItemStatus.IN_PROGRESS,
        progress: 40,
        hoursSpent: 12,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.booksRepo.save(
      this.booksRepo.create({
        title: 'Atomic Habits',
        author: 'James Clear',
        learningStatus: LearningItemStatus.IN_PROGRESS,
        pagesRead: 120,
        totalPages: 320,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.projectsRepo.save(
      this.projectsRepo.create({
        name: 'LifeOS Backend',
        learningStatus: LearningItemStatus.IN_PROGRESS,
        progress: 60,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.studySessionsRepo.save(
      this.studySessionsRepo.create({
        sessionDate: today,
        durationMinutes: 45,
        topic: 'NestJS modules',
        skillId: skill.id,
        courseId: course.id,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    const account = await this.accountsRepo.save(
      this.accountsRepo.create({
        name: 'Main Checking',
        accountType: AccountType.CHECKING,
        balance: 5000,
        currency: 'ETB',
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    const expenseCategory = await this.expenseCategoriesRepo.save(
      this.expenseCategoriesRepo.create({
        name: 'Food',
        icon: 'restaurant',
        color: '#FF5722',
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.incomeCategoriesRepo.save(
      this.incomeCategoriesRepo.create({
        name: 'Salary',
        icon: 'payments',
        color: '#4CAF50',
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.transactionsRepo.save(
      this.transactionsRepo.create({
        accountId: account.id,
        transactionType: TransactionType.EXPENSE,
        amount: 45.5,
        transactionDate: today,
        description: 'Groceries',
        categoryId: expenseCategory.id,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.budgetsRepo.save(
      this.budgetsRepo.create({
        name: 'Monthly Food',
        amount: 500,
        spent: 120,
        periodStart: today.slice(0, 8) + '01',
        periodEnd: today,
        categoryId: expenseCategory.id,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.savingsGoalsRepo.save(
      this.savingsGoalsRepo.create({
        name: 'Emergency Fund',
        targetAmount: 10000,
        currentAmount: 2500,
        targetDate: `${new Date().getFullYear()}-12-31`,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.englishRepo.save(
      this.englishRepo.create({
        practiceType: EnglishPracticeType.SPEAKING,
        practiceDate: today,
        durationMinutes: 30,
        score: 85,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.spiritualRepo.save(
      this.spiritualRepo.create({
        activityType: SpiritualActivityType.PRAYER,
        activityDate: today,
        durationMinutes: 15,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.healthRepo.save(
      this.healthRepo.create({
        metricType: HealthMetricType.STEPS,
        logDate: today,
        value: 8500,
        unit: 'steps',
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.journalRepo.save(
      this.journalRepo.create({
        entryType: JournalEntryType.GRATITUDE,
        entryDate: today,
        title: 'Grateful today',
        content: 'Grateful for progress on LifeOS.',
        tags: ['gratitude', 'lifeos'],
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.notificationsRepo.save(
      this.notificationsRepo.create({
        title: 'Welcome to LifeOS',
        message: 'Your demo account is ready. Explore all modules!',
        isRead: false,
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.settingsRepo.save(
      this.settingsRepo.create({
        timezone: this.config.get<string>('calendar.defaultTimezone') ?? 'Africa/Nairobi',
        locale: 'en',
        theme: 'light',
        modulePreferences: { accentColor: 'teal' },
        notificationPreferences: { email: true, push: false },
        integrations: {
          calendarFeed: {
            embedSrc: this.config.get<string>('calendar.defaultEmbedSrc') || undefined,
            icalFeedUrl: this.config.get<string>('calendar.defaultIcalUrl') || undefined,
            timezone:
              this.config.get<string>('calendar.defaultTimezone') ?? 'Africa/Nairobi',
          },
        },
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    await this.aiCoachRepo.save(
      this.aiCoachRepo.create({
        title: 'Weekly planning session',
        context: 'Planning the week ahead',
        messages: [
          {
            role: 'user',
            content: 'Help me plan my week',
            createdAt: new Date().toISOString(),
          },
        ],
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      }),
    );

    this.logger.log(`Seeded demo user: ${DEMO_EMAIL}`);
  }
}
