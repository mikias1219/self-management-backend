import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays, format } from 'date-fns';
import { Between, In, Repository } from 'typeorm';
import { AnalyticsPeriod } from '../../../../common/domain/enums/period.enum';
import { resolveDateRange } from '../../../../common/utils/date-range.util';
import { ActivityLog } from '../../../activity-logs/domain/entities/activity-log.entity';
import { AchievementsService } from '../../../achievements/application/services/achievements.service';
import { AnalyticsService } from '../../../analytics/application/services/analytics.service';
import { LifeIntelligenceService } from '../../../analytics/application/services/life-intelligence.service';
import { DailyReview } from '../../../daily-reviews/domain/entities/daily-review.entity';
import { EnglishPractice } from '../../../english/domain/entities/english-practice.entity';
import { FinanceAccount } from '../../../finance/domain/entities/account.entity';
import { FinanceBudget } from '../../../finance/domain/entities/budget.entity';
import { FinanceTransaction } from '../../../finance/domain/entities/transaction.entity';
import { TransactionType } from '../../../finance/domain/enums/finance.enums';
import { Goal } from '../../../goals/domain/entities/goal.entity';
import { Habit } from '../../../habits/domain/entities/habit.entity';
import { HabitLog } from '../../../habits/domain/entities/habit-log.entity';
import { HealthLog } from '../../../health/domain/entities/health-log.entity';
import { Book } from '../../../learning/domain/entities/book.entity';
import { Course } from '../../../learning/domain/entities/course.entity';
import { LearningProject } from '../../../learning/domain/entities/learning-project.entity';
import { StudySession } from '../../../learning/domain/entities/study-session.entity';
import { JournalEntry } from '../../../journal/domain/entities/journal-entry.entity';
import { Notification } from '../../../notifications/domain/entities/notification.entity';
import { SpiritualActivity } from '../../../spiritual/domain/entities/spiritual-activity.entity';
import { ProductivityScheduleService } from '../../../productivity/application/services/productivity-schedule.service';
import { Task } from '../../../tasks/domain/entities/task.entity';
import { TaskStatus } from '../../../tasks/domain/enums/task.enums';

function toNum(v: unknown): number {
  return Number(v ?? 0);
}

function slimTask(t: Task) {
  return {
    title: t.title,
    status: t.taskStatus,
    priority: t.priority,
    dueDate: t.dueDate ?? null,
    scheduledAt: t.scheduledAt ?? null,
    estimatedMinutes: t.estimatedMinutes ?? null,
    timeSpentMinutes: t.timeSpentMinutes ?? null,
    syncedToCalendar: !!t.googleCalendarEventId,
    category: t.category ?? null,
    description: t.description?.slice(0, 120) ?? null,
  };
}

function slimTx(tx: FinanceTransaction) {
  return {
    type: tx.transactionType,
    amount: toNum(tx.amount),
    date: tx.transactionDate,
    description: tx.description ?? null,
  };
}

/** Maps each LifeOS API area to snapshot data the assistant can cite. */
export const LIFEOS_MODULES = [
  'schedule',
  'tasks',
  'goals',
  'habits',
  'dailyReviews',
  'finance',
  'learning',
  'english',
  'spiritual',
  'health',
  'journal',
  'notifications',
  'activityLogs',
  'analytics',
  'achievements',
] as const;

@Injectable()
export class AiChatContextService {
  constructor(
    private readonly achievementsService: AchievementsService,
    private readonly analyticsService: AnalyticsService,
    private readonly lifeIntelligence: LifeIntelligenceService,
    @InjectRepository(Task) private readonly tasksRepo: Repository<Task>,
    @InjectRepository(FinanceTransaction)
    private readonly txRepo: Repository<FinanceTransaction>,
    @InjectRepository(FinanceAccount)
    private readonly accountsRepo: Repository<FinanceAccount>,
    @InjectRepository(FinanceBudget)
    private readonly budgetsRepo: Repository<FinanceBudget>,
    @InjectRepository(Goal) private readonly goalsRepo: Repository<Goal>,
    @InjectRepository(Habit) private readonly habitsRepo: Repository<Habit>,
    @InjectRepository(HabitLog) private readonly habitLogsRepo: Repository<HabitLog>,
    @InjectRepository(HealthLog) private readonly healthRepo: Repository<HealthLog>,
    @InjectRepository(DailyReview) private readonly reviewsRepo: Repository<DailyReview>,
    @InjectRepository(JournalEntry) private readonly journalRepo: Repository<JournalEntry>,
    @InjectRepository(EnglishPractice)
    private readonly englishRepo: Repository<EnglishPractice>,
    @InjectRepository(SpiritualActivity)
    private readonly spiritualRepo: Repository<SpiritualActivity>,
    @InjectRepository(StudySession)
    private readonly studySessionsRepo: Repository<StudySession>,
    @InjectRepository(Book) private readonly booksRepo: Repository<Book>,
    @InjectRepository(Course) private readonly coursesRepo: Repository<Course>,
    @InjectRepository(LearningProject)
    private readonly projectsRepo: Repository<LearningProject>,
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
    @InjectRepository(ActivityLog)
    private readonly activityLogsRepo: Repository<ActivityLog>,
    private readonly productivitySchedule: ProductivityScheduleService,
  ) {}

  async buildForUser(userId: string) {
    const aiContext = await this.lifeIntelligence.buildAiContext(userId);
    const dayRange = resolveDateRange(AnalyticsPeriod.DAY);
    const weekRange = resolveDateRange(AnalyticsPeriod.WEEK);
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const dateBetween = Between(
      format(dayRange.start, 'yyyy-MM-dd'),
      format(dayRange.end, 'yyyy-MM-dd'),
    );
    const timeBetween = Between(dayRange.start, dayRange.end);

    const [
      analyticsToday,
      analyticsWeek,
      dueToday,
      openTasks,
      completedToday,
      todayTransactions,
      accounts,
      budgets,
      goals,
      habits,
      habitLogsToday,
      healthToday,
      reviewToday,
      journalToday,
      englishToday,
      spiritualToday,
      studySessionsToday,
      books,
      courses,
      projects,
      unreadCount,
      recentNotifications,
      recentActivity,
      unifiedSchedule,
    ] = await Promise.all([
      this.analyticsService.getCountsByPeriod(userId, {
        period: AnalyticsPeriod.DAY,
      }),
      this.analyticsService.getCountsByPeriod(userId, {
        period: AnalyticsPeriod.WEEK,
      }),
      this.tasksRepo.find({
        where: { createdBy: userId, dueDate: timeBetween },
        order: { priority: 'DESC', dueDate: 'ASC' },
        take: 25,
      }),
      this.tasksRepo.find({
        where: {
          createdBy: userId,
          taskStatus: In([
            TaskStatus.TODO,
            TaskStatus.IN_PROGRESS,
            TaskStatus.BLOCKED,
          ]),
        },
        order: { dueDate: 'ASC', createdAt: 'DESC' },
        take: 30,
      }),
      this.tasksRepo.find({
        where: {
          createdBy: userId,
          taskStatus: TaskStatus.DONE,
          completedAt: timeBetween,
        },
        order: { completedAt: 'DESC' },
        take: 20,
      }),
      this.txRepo.find({
        where: { createdBy: userId, transactionDate: dateBetween },
        order: { transactionDate: 'DESC', createdAt: 'DESC' },
      }),
      this.accountsRepo.find({
        where: { createdBy: userId },
        order: { name: 'ASC' },
      }),
      this.budgetsRepo.find({
        where: { createdBy: userId },
        order: { periodEnd: 'DESC' },
        take: 10,
      }),
      this.goalsRepo.find({
        where: { createdBy: userId },
        order: { updatedAt: 'DESC' },
        take: 20,
      }),
      this.habitsRepo.find({
        where: { createdBy: userId },
        order: { name: 'ASC' },
        take: 25,
      }),
      this.habitLogsRepo.find({
        where: { createdBy: userId, completedAt: timeBetween },
        order: { completedAt: 'DESC' },
        take: 40,
      }),
      this.healthRepo.find({
        where: { createdBy: userId, logDate: dateBetween },
        order: { logDate: 'DESC' },
        take: 15,
      }),
      this.reviewsRepo.find({
        where: { createdBy: userId, reviewDate: dateBetween },
        take: 2,
      }),
      this.journalRepo.find({
        where: { createdBy: userId, entryDate: dateBetween },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.englishRepo.find({
        where: { createdBy: userId, practiceDate: dateBetween },
        order: { practiceDate: 'DESC' },
        take: 15,
      }),
      this.spiritualRepo.find({
        where: { createdBy: userId, activityDate: dateBetween },
        order: { activityDate: 'DESC' },
        take: 15,
      }),
      this.studySessionsRepo.find({
        where: { createdBy: userId, sessionDate: dateBetween },
        order: { sessionDate: 'DESC' },
        take: 15,
      }),
      this.booksRepo.find({
        where: { createdBy: userId },
        order: { updatedAt: 'DESC' },
        take: 12,
      }),
      this.coursesRepo.find({
        where: { createdBy: userId },
        order: { updatedAt: 'DESC' },
        take: 12,
      }),
      this.projectsRepo.find({
        where: { createdBy: userId },
        order: { updatedAt: 'DESC' },
        take: 10,
      }),
      this.notificationsRepo.count({
        where: { createdBy: userId, isRead: false },
      }),
      this.notificationsRepo.find({
        where: { createdBy: userId },
        order: { createdAt: 'DESC' },
        take: 8,
      }),
      this.activityLogsRepo.find({
        where: { userId, createdAt: timeBetween },
        order: { createdAt: 'DESC' },
        take: 25,
      }),
      this.productivitySchedule.getSchedule(userId, 7, 'upcoming'),
    ]);

    let todayExpense = 0;
    let todayIncome = 0;
    const expenses: ReturnType<typeof slimTx>[] = [];
    const income: ReturnType<typeof slimTx>[] = [];

    for (const tx of todayTransactions) {
      const slim = slimTx(tx);
      if (tx.transactionType === TransactionType.EXPENSE) {
        todayExpense += toNum(tx.amount);
        expenses.push(slim);
      } else if (tx.transactionType === TransactionType.INCOME) {
        todayIncome += toNum(tx.amount);
        income.push(slim);
      }
    }

    const habitNames = new Map(habits.map((h) => [h.id, h.name]));
    const loggedHabitIds = new Set(habitLogsToday.map((l) => l.habitId));
    const primaryCurrency = accounts[0]?.currency ?? 'ETB';

    const [achievementsToday, achievementsWeek] = await Promise.all([
      this.achievementsService.getSnapshot(userId, {
        period: AnalyticsPeriod.DAY,
      }),
      this.achievementsService.getSnapshot(userId, {
        period: AnalyticsPeriod.WEEK,
      }),
    ]);

    return {
      meta: {
        generatedAt: new Date().toISOString(),
        today: todayStr,
        weekRange: {
          start: format(weekRange.start, 'yyyy-MM-dd'),
          end: format(weekRange.end, 'yyyy-MM-dd'),
        },
        primaryCurrency: aiContext.profile.primaryCurrency,
        modulesInSnapshot: [...LIFEOS_MODULES],
      },
      profile: aiContext.profile,
      intelligence: aiContext.intelligence,
      analytics: {
        today: analyticsToday.counts,
        thisWeek: analyticsWeek.counts,
      },
      schedule: {
        api: '/productivity/schedule',
        summary: unifiedSchedule.summary,
        todaySuccess: unifiedSchedule.todaySuccess,
        googleCalendar: unifiedSchedule.googleCalendar,
        todayAndUpcoming: unifiedSchedule.items
          .filter((i) => new Date(i.start) <= addDays(new Date(), 2))
          .slice(0, 40)
          .map((i) => ({
            kind: i.kind,
            title: i.title,
            start: i.start,
            end: i.end ?? null,
            status: i.status ?? null,
            progress: i.progress ?? null,
            measurable: i.measurable ?? null,
          })),
        totalItems: unifiedSchedule.items.length,
      },
      tasks: {
        api: '/tasks',
        ...aiContext.tasks,
        dueToday: dueToday.map(slimTask),
        open: openTasks.map(slimTask),
        completedToday: completedToday.map(slimTask),
        counts: {
          dueToday: dueToday.length,
          open: openTasks.length,
          completedToday: completedToday.length,
        },
      },
      goals: {
        api: '/goals',
        items: goals.map((g) => ({
          title: g.title,
          level: g.level,
          progressPercent: Math.round((g.progress ?? 0) * 100) / 100,
          targetDate: g.targetDate ?? null,
          category: g.category ?? null,
          lifeArea: g.lifeArea ?? null,
        })),
        tracked: aiContext.goals,
        count: goals.length,
      },
      habits: {
        api: '/habits',
        active: habits.map((h) => ({
          name: h.name,
          streak: h.currentStreak,
          bestStreak: h.bestStreak,
          loggedToday: loggedHabitIds.has(h.id),
        })),
        completedToday: habitLogsToday.map((l) => ({
          habit: habitNames.get(l.habitId) ?? l.habitId,
          at: l.completedAt,
          notes: l.notes ?? null,
        })),
        notLoggedToday: habits
          .filter((h) => !loggedHabitIds.has(h.id))
          .map((h) => h.name),
      },
      dailyReviews: {
        api: '/daily-reviews',
        today: reviewToday.map((r) => ({
          date: r.reviewDate,
          moodScore: r.moodScore ?? null,
          productivityScore: r.productivityScore ?? null,
          wins: r.wins ?? null,
          challenges: r.challenges ?? null,
          tomorrowFocus: r.tomorrowFocus ?? null,
        })),
      },
      finance: {
        api: '/finance',
        ...aiContext.finance,
        todayExpenseTotal: todayExpense,
        todayIncomeTotal: todayIncome,
        todayNet: todayIncome - todayExpense,
        currency: aiContext.profile.primaryCurrency,
        expenses,
        income,
        budgets: budgets.map((b) => ({
          name: b.name,
          limit: toNum(b.amount),
          spent: toNum(b.spent),
          remaining: toNum(b.amount) - toNum(b.spent),
          period: `${b.periodStart} → ${b.periodEnd}`,
        })),
      },
      learning: {
        api: '/learning',
        studySessionsToday: studySessionsToday.map((s) => ({
          date: s.sessionDate,
          minutes: s.durationMinutes,
          topic: s.topic ?? null,
          notes: s.notes?.slice(0, 100) ?? null,
        })),
        books: books.map((b) => ({
          title: b.title,
          author: b.author ?? null,
          status: b.learningStatus,
          pages: `${b.pagesRead}/${b.totalPages ?? '?'}`,
        })),
        courses: courses.map((c) => ({
          title: c.title,
          status: c.learningStatus,
          progress: c.progress ?? 0,
        })),
        projects: projects.map((p) => ({
          name: p.name,
          status: p.learningStatus,
          progress: p.progress ?? 0,
        })),
      },
      english: {
        api: '/english',
        today: englishToday.map((e) => ({
          type: e.practiceType,
          date: e.practiceDate,
          minutes: e.durationMinutes,
          score: e.score ?? null,
          notes: e.notes?.slice(0, 80) ?? null,
        })),
      },
      spiritual: {
        api: '/spiritual',
        today: spiritualToday.map((s) => ({
          type: s.activityType,
          date: s.activityDate,
          minutes: s.durationMinutes ?? null,
          notes: s.notes?.slice(0, 80) ?? null,
        })),
      },
      health: {
        api: '/health',
        today: healthToday.map((h) => ({
          metric: h.metricType,
          value: h.value,
          unit: h.unit ?? null,
          date: h.logDate,
        })),
      },
      journal: {
        api: '/journal',
        today: journalToday.map((j) => ({
          type: j.entryType,
          title: j.title,
          date: j.entryDate,
          excerpt: j.content.slice(0, 150),
          tags: j.tags ?? [],
        })),
      },
      notifications: {
        api: '/notifications',
        unreadCount,
        recent: recentNotifications.map((n) => ({
          title: n.title,
          message: n.message.slice(0, 120),
          isRead: n.isRead,
          createdAt: n.createdAt,
        })),
      },
      activityLogs: {
        api: '/activity-logs',
        today: recentActivity.map((a) => ({
          module: a.module,
          action: a.action,
          entityType: a.entityType,
          description: a.description ?? null,
          at: a.createdAt,
        })),
      },
      achievements: {
        api: '/achievements',
        today: {
          overall: achievementsToday.overall,
          modules: achievementsToday.modules.map((m) => ({
            module: m.module,
            ongoing: m.ongoing,
            finished: m.finished,
            achieved: m.achieved,
            completionRate: m.completionRate,
          })),
          recentReports: achievementsToday.reports.slice(0, 8),
        },
        thisWeek: {
          overall: achievementsWeek.overall,
          modules: achievementsWeek.modules.map((m) => ({
            module: m.module,
            finished: m.finished,
            achieved: m.achieved,
            completionRate: m.completionRate,
          })),
        },
      },
    };
  }
}
