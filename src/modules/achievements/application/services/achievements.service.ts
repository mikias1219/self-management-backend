import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format } from 'date-fns';
import { Between, In, Repository } from 'typeorm';
import { AchievementStatus } from '../../../../common/domain/enums/achievement-status.enum';
import {
  ActivityAction,
  ActivityModule,
} from '../../../../common/domain/enums/activity-action.enum';
import { AnalyticsPeriod } from '../../../../common/domain/enums/period.enum';
import { DateRangeQueryDto } from '../../../../common/dto/date-range.dto';
import { resolveDateRange } from '../../../../common/utils/date-range.util';
import { ActivityLog } from '../../../activity-logs/domain/entities/activity-log.entity';
import { DailyReview } from '../../../daily-reviews/domain/entities/daily-review.entity';
import { EnglishPractice } from '../../../english/domain/entities/english-practice.entity';
import { FinanceBudget } from '../../../finance/domain/entities/budget.entity';
import { SavingsGoal } from '../../../finance/domain/entities/savings-goal.entity';
import { FinanceTransaction } from '../../../finance/domain/entities/transaction.entity';
import { Goal } from '../../../goals/domain/entities/goal.entity';
import { Habit } from '../../../habits/domain/entities/habit.entity';
import { HabitLog } from '../../../habits/domain/entities/habit-log.entity';
import { HealthLog } from '../../../health/domain/entities/health-log.entity';
import { Book } from '../../../learning/domain/entities/book.entity';
import { Course } from '../../../learning/domain/entities/course.entity';
import { LearningProject } from '../../../learning/domain/entities/learning-project.entity';
import { StudySession } from '../../../learning/domain/entities/study-session.entity';
import { LearningItemStatus } from '../../../learning/domain/enums/learning.enums';
import { JournalEntry } from '../../../journal/domain/entities/journal-entry.entity';
import { Notification } from '../../../notifications/domain/entities/notification.entity';
import { SpiritualActivity } from '../../../spiritual/domain/entities/spiritual-activity.entity';
import { Task } from '../../../tasks/domain/entities/task.entity';
import { TaskPriority, TaskStatus } from '../../../tasks/domain/enums/task.enums';

function toNum(v: unknown): number {
  return Number(v ?? 0);
}

function rate(finished: number, total: number): number {
  if (total <= 0) return finished > 0 ? 100 : 0;
  return Math.min(100, Math.round((finished / total) * 100));
}

export interface AchievementHighlight {
  id: string;
  title: string;
  status: AchievementStatus;
  finishedAt?: string;
  detail?: string;
}

export interface PlannedVsAchieved {
  plannedCount: number;
  achievedCount: number;
  missedCount: number;
  ongoingCount: number;
  plannedMinutes: number;
  achievedMinutes: number;
  fulfillmentRate: number;
}

export interface ModuleAchievementStats {
  module: string;
  label: string;
  href: string;
  ongoing: number;
  finished: number;
  achieved: number;
  notStarted: number;
  total: number;
  completionRate: number;
  planned?: PlannedVsAchieved;
  highlights: AchievementHighlight[];
}

export interface AchievementReport {
  id: string;
  module: string;
  moduleLabel: string;
  title: string;
  status: AchievementStatus;
  finishedAt: string;
  description?: string;
}

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(Task) private readonly tasksRepo: Repository<Task>,
    @InjectRepository(Goal) private readonly goalsRepo: Repository<Goal>,
    @InjectRepository(Habit) private readonly habitsRepo: Repository<Habit>,
    @InjectRepository(HabitLog) private readonly habitLogsRepo: Repository<HabitLog>,
    @InjectRepository(Book) private readonly booksRepo: Repository<Book>,
    @InjectRepository(Course) private readonly coursesRepo: Repository<Course>,
    @InjectRepository(LearningProject)
    private readonly projectsRepo: Repository<LearningProject>,
    @InjectRepository(StudySession)
    private readonly studySessionsRepo: Repository<StudySession>,
    @InjectRepository(DailyReview)
    private readonly reviewsRepo: Repository<DailyReview>,
    @InjectRepository(FinanceTransaction)
    private readonly txRepo: Repository<FinanceTransaction>,
    @InjectRepository(FinanceBudget)
    private readonly budgetsRepo: Repository<FinanceBudget>,
    @InjectRepository(SavingsGoal)
    private readonly savingsRepo: Repository<SavingsGoal>,
    @InjectRepository(EnglishPractice)
    private readonly englishRepo: Repository<EnglishPractice>,
    @InjectRepository(SpiritualActivity)
    private readonly spiritualRepo: Repository<SpiritualActivity>,
    @InjectRepository(HealthLog) private readonly healthRepo: Repository<HealthLog>,
    @InjectRepository(JournalEntry) private readonly journalRepo: Repository<JournalEntry>,
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
    @InjectRepository(ActivityLog)
    private readonly activityLogsRepo: Repository<ActivityLog>,
  ) {}

  async getSnapshot(userId: string, query: DateRangeQueryDto) {
    const range = resolveDateRange(
      query.period ?? AnalyticsPeriod.WEEK,
      query.startDate,
      query.endDate,
    );
    const timeBetween = Between(range.start, range.end);
    const dateBetween = Between(
      format(range.start, 'yyyy-MM-dd'),
      format(range.end, 'yyyy-MM-dd'),
    );

    const [
      allTasks,
      finishedTasks,
      allGoals,
      habits,
      habitLogs,
      books,
      courses,
      projects,
      studySessions,
      reviews,
      transactions,
      budgets,
      savingsGoals,
      english,
      spiritual,
      health,
      journal,
      readNotifications,
      activityReports,
    ] = await Promise.all([
      this.tasksRepo.find({ where: { createdBy: userId } }),
      this.tasksRepo.find({
        where: {
          createdBy: userId,
          taskStatus: TaskStatus.DONE,
          completedAt: timeBetween,
        },
        order: { completedAt: 'DESC' },
        take: 15,
      }),
      this.goalsRepo.find({ where: { createdBy: userId } }),
      this.habitsRepo.find({ where: { createdBy: userId } }),
      this.habitLogsRepo.find({
        where: { createdBy: userId, completedAt: timeBetween },
        order: { completedAt: 'DESC' },
        take: 20,
      }),
      this.booksRepo.find({ where: { createdBy: userId } }),
      this.coursesRepo.find({ where: { createdBy: userId } }),
      this.projectsRepo.find({ where: { createdBy: userId } }),
      this.studySessionsRepo.find({
        where: { createdBy: userId, sessionDate: dateBetween },
      }),
      this.reviewsRepo.find({
        where: { createdBy: userId, reviewDate: dateBetween },
      }),
      this.txRepo.find({
        where: { createdBy: userId, transactionDate: dateBetween },
      }),
      this.budgetsRepo.find({ where: { createdBy: userId } }),
      this.savingsRepo.find({ where: { createdBy: userId } }),
      this.englishRepo.find({
        where: { createdBy: userId, practiceDate: dateBetween },
      }),
      this.spiritualRepo.find({
        where: { createdBy: userId, activityDate: dateBetween },
      }),
      this.healthRepo.find({
        where: { createdBy: userId, logDate: dateBetween },
      }),
      this.journalRepo.find({
        where: { createdBy: userId, entryDate: dateBetween },
      }),
      this.notificationsRepo.find({
        where: {
          createdBy: userId,
          isRead: true,
          readAt: timeBetween,
        },
        take: 10,
      }),
      this.activityLogsRepo.find({
        where: {
          userId,
          createdAt: timeBetween,
          action: In([
            ActivityAction.COMPLETED,
            ActivityAction.LOGGED,
          ]),
        },
        order: { createdAt: 'DESC' },
        take: 40,
      }),
    ]);

    const planStats = this.computeTaskPlanStats(allTasks, range, dateBetween);
    const periodTasks = this.tasksInPeriod(allTasks, range, dateBetween);

    const ongoingTasks = allTasks.filter((t) =>
      [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED].includes(
        t.taskStatus,
      ),
    );
    const achievedGoals = allGoals.filter((g) => (g.progress ?? 0) >= 100);
    const ongoingGoals = allGoals.filter((g) => (g.progress ?? 0) < 100);
    const goalsFinishedInPeriod = allGoals.filter(
      (g) =>
        (g.progress ?? 0) >= 100 &&
        g.updatedAt >= range.start &&
        g.updatedAt <= range.end,
    );

    const learningItems = [
      ...books.map((b) => ({ kind: 'book' as const, item: b })),
      ...courses.map((c) => ({ kind: 'course' as const, item: c })),
      ...projects.map((p) => ({ kind: 'project' as const, item: p })),
    ];
    const learningOngoing = learningItems.filter(
      (x) => x.item.learningStatus === LearningItemStatus.IN_PROGRESS,
    );
    const learningAchieved = learningItems.filter(
      (x) =>
        x.item.learningStatus === LearningItemStatus.COMPLETED &&
        x.item.updatedAt >= range.start &&
        x.item.updatedAt <= range.end,
    );
    const learningNotStarted = learningItems.filter(
      (x) => x.item.learningStatus === LearningItemStatus.NOT_STARTED,
    );

    const habitNames = new Map(habits.map((h) => [h.id, h.name]));
    const habitsLoggedIds = new Set(habitLogs.map((l) => l.habitId));
    const habitsNotLogged = habits.filter((h) => !habitsLoggedIds.has(h.id));

    const budgetsOnTrack = budgets.filter(
      (b) => toNum(b.spent) <= toNum(b.amount),
    );
    const savingsAchieved = savingsGoals.filter(
      (s) => toNum(s.currentAmount) >= toNum(s.targetAmount),
    );

    const lifeFinished =
      english.length +
      spiritual.length +
      health.length +
      journal.length +
      studySessions.length;

    const modules: ModuleAchievementStats[] = [
      {
        module: 'tasks',
        label: 'Tasks & plans',
        href: '/productivity?tab=plans',
        ongoing: planStats.ongoingCount,
        finished: planStats.achievedCount,
        achieved: finishedTasks.filter((t) =>
          [TaskPriority.URGENT, TaskPriority.HIGH].includes(t.priority),
        ).length,
        notStarted: planStats.missedCount,
        total: planStats.plannedCount,
        completionRate: planStats.fulfillmentRate,
        planned: planStats,
        highlights: periodTasks.slice(0, 6).map((t) => ({
          id: t.id,
          title: t.title,
          status:
            t.taskStatus === TaskStatus.DONE
              ? AchievementStatus.ACHIEVED
              : AchievementStatus.ONGOING,
          finishedAt: t.completedAt?.toISOString(),
          detail: `${t.timeSpentMinutes ?? 0}/${t.estimatedMinutes ?? 0} min`,
        })),
      },
      {
        module: 'goals',
        label: 'Goals',
        href: '/productivity?tab=goals',
        ongoing: ongoingGoals.length,
        finished: goalsFinishedInPeriod.length,
        achieved: achievedGoals.length,
        notStarted: 0,
        total: allGoals.length,
        completionRate: rate(achievedGoals.length, allGoals.length),
        highlights: achievedGoals.slice(0, 5).map((g) => ({
          id: g.id,
          title: g.title,
          status: AchievementStatus.ACHIEVED,
          finishedAt: g.updatedAt.toISOString(),
          detail: `${Math.round(g.progress ?? 0)}%`,
        })),
      },
      {
        module: 'habits',
        label: 'Habits',
        href: '/productivity?tab=habits',
        ongoing: habitsNotLogged.length,
        finished: habitLogs.length,
        achieved: habits.filter((h) => h.currentStreak >= 7).length,
        notStarted: 0,
        total: habits.length,
        completionRate: rate(habitLogs.length, habits.length || 1),
        highlights: habitLogs.slice(0, 5).map((l) => ({
          id: l.id,
          title: habitNames.get(l.habitId) ?? 'Habit',
          status: AchievementStatus.FINISHED,
          finishedAt: l.completedAt.toISOString(),
        })),
      },
      {
        module: 'learning',
        label: 'Learning',
        href: '/growth?tab=learning',
        ongoing: learningOngoing.length,
        finished: studySessions.length + learningAchieved.length,
        achieved: learningAchieved.length,
        notStarted: learningNotStarted.length,
        total: learningItems.length,
        completionRate: rate(
          learningAchieved.length + studySessions.length,
          learningItems.length || 1,
        ),
        highlights: [
          ...learningAchieved.slice(0, 3).map((x) => ({
            id: x.item.id,
            title:
              'title' in x.item
                ? (x.item as Book | Course).title
                : (x.item as LearningProject).name,
            status: AchievementStatus.ACHIEVED,
            finishedAt: x.item.updatedAt.toISOString(),
          })),
          ...studySessions.slice(0, 2).map((s) => ({
            id: s.id,
            title: s.topic ?? 'Study session',
            status: AchievementStatus.FINISHED,
            finishedAt: s.sessionDate,
            detail: `${s.durationMinutes} min`,
          })),
        ],
      },
      {
        module: 'dailyReviews',
        label: 'Daily Reviews',
        href: '/productivity?tab=reviews',
        ongoing: reviews.length > 0 ? 0 : 1,
        finished: reviews.length,
        achieved: reviews.filter((r) => (r.productivityScore ?? 0) >= 8).length,
        notStarted: reviews.length === 0 ? 1 : 0,
        total: 1,
        completionRate: reviews.length > 0 ? 100 : 0,
        highlights: reviews.map((r) => ({
          id: r.id,
          title: `Review ${r.reviewDate}`,
          status: AchievementStatus.FINISHED,
          finishedAt: r.createdAt.toISOString(),
          detail:
            r.moodScore != null ? `Mood ${r.moodScore}/10` : undefined,
        })),
      },
      {
        module: 'finance',
        label: 'Finance',
        href: '/life?tab=finance',
        ongoing: budgets.length - budgetsOnTrack.length,
        finished: transactions.length,
        achieved: savingsAchieved.length,
        notStarted: 0,
        total: budgets.length + savingsGoals.length,
        completionRate: rate(
          budgetsOnTrack.length + savingsAchieved.length,
          budgets.length + savingsGoals.length || 1,
        ),
        highlights: savingsAchieved.slice(0, 3).map((s) => ({
          id: s.id,
          title: s.name,
          status: AchievementStatus.ACHIEVED,
          detail: `${toNum(s.currentAmount)} / ${toNum(s.targetAmount)}`,
        })),
      },
      {
        module: 'english',
        label: 'English',
        href: '/growth?tab=english',
        ongoing: 0,
        finished: english.length,
        achieved: english.filter((e) => (e.score ?? 0) >= 80).length,
        notStarted: 0,
        total: english.length,
        completionRate: english.length > 0 ? 100 : 0,
        highlights: english.slice(0, 3).map((e) => ({
          id: e.id,
          title: `${e.practiceType} practice`,
          status: AchievementStatus.FINISHED,
          finishedAt: e.practiceDate,
          detail: `${e.durationMinutes} min`,
        })),
      },
      {
        module: 'spiritual',
        label: 'Spiritual',
        href: '/life?tab=spiritual',
        ongoing: 0,
        finished: spiritual.length,
        achieved: spiritual.length,
        notStarted: 0,
        total: spiritual.length,
        completionRate: spiritual.length > 0 ? 100 : 0,
        highlights: spiritual.slice(0, 3).map((s) => ({
          id: s.id,
          title: s.activityType,
          status: AchievementStatus.FINISHED,
          finishedAt: s.activityDate,
        })),
      },
      {
        module: 'health',
        label: 'Health',
        href: '/life?tab=health',
        ongoing: 0,
        finished: health.length,
        achieved: health.length,
        notStarted: 0,
        total: health.length,
        completionRate: health.length > 0 ? 100 : 0,
        highlights: health.slice(0, 3).map((h) => ({
          id: h.id,
          title: h.metricType,
          status: AchievementStatus.FINISHED,
          finishedAt: h.logDate,
          detail: `${h.value}${h.unit ? ` ${h.unit}` : ''}`,
        })),
      },
      {
        module: 'journal',
        label: 'Journal',
        href: '/life?tab=journal',
        ongoing: 0,
        finished: journal.length,
        achieved: journal.length,
        notStarted: 0,
        total: journal.length,
        completionRate: journal.length > 0 ? 100 : 0,
        highlights: journal.slice(0, 3).map((j) => ({
          id: j.id,
          title: j.title,
          status: AchievementStatus.FINISHED,
          finishedAt: j.entryDate,
        })),
      },
      {
        module: 'notifications',
        label: 'Notifications',
        href: '/notifications',
        ongoing: 0,
        finished: readNotifications.length,
        achieved: readNotifications.length,
        notStarted: 0,
        total: readNotifications.length,
        completionRate: readNotifications.length > 0 ? 100 : 0,
        highlights: readNotifications.slice(0, 3).map((n) => ({
          id: n.id,
          title: n.title,
          status: AchievementStatus.FINISHED,
          finishedAt: n.readAt?.toISOString(),
        })),
      },
    ];

    const moduleRates = modules
      .filter((m) => m.total > 0 || m.finished > 0)
      .map((m) => m.completionRate);
    const activityScore =
      moduleRates.length > 0
        ? Math.round(
            moduleRates.reduce((a, b) => a + b, 0) / moduleRates.length,
          )
        : 0;
    const overallScore =
      planStats.plannedCount > 0
        ? planStats.fulfillmentRate
        : activityScore;

    const totals = modules.reduce(
      (acc, m) => ({
        ongoing: acc.ongoing + m.ongoing,
        finished: acc.finished + m.finished,
        achieved: acc.achieved + m.achieved,
        notStarted: acc.notStarted + m.notStarted,
      }),
      { ongoing: 0, finished: 0, achieved: 0, notStarted: 0 },
    );

    const reports = this.buildReports(
      activityReports,
      finishedTasks,
      habitLogs,
      habitNames,
    );

    return {
      period: query.period ?? AnalyticsPeriod.WEEK,
      range: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      },
      plannedVsAchieved: planStats,
      overall: {
        score: overallScore,
        ...totals,
        completionRate:
          planStats.plannedCount > 0
            ? planStats.fulfillmentRate
            : rate(
                totals.finished + totals.achieved,
                totals.ongoing + totals.finished + totals.achieved || 1,
              ),
        modulesTracked: modules.length,
        activityScore,
      },
      modules,
      reports,
    };
  }

  private tasksInPeriod(
    tasks: Task[],
    range: { start: Date; end: Date },
    dateBetween: ReturnType<typeof Between>,
  ): Task[] {
    const startStr = format(range.start, 'yyyy-MM-dd');
    const endStr = format(range.end, 'yyyy-MM-dd');

    return tasks.filter((t) => {
      if (t.taskStatus === TaskStatus.CANCELLED) return false;
      if (t.dueDate) {
        const d = format(new Date(t.dueDate), 'yyyy-MM-dd');
        if (d >= startStr && d <= endStr) return true;
      }
      if (
        t.completedAt &&
        t.completedAt >= range.start &&
        t.completedAt <= range.end
      ) {
        return true;
      }
      return false;
    });
  }

  private computeTaskPlanStats(
    allTasks: Task[],
    range: { start: Date; end: Date },
    _dateBetween: ReturnType<typeof Between>,
  ): PlannedVsAchieved {
    const periodTasks = this.tasksInPeriod(allTasks, range, _dateBetween);
    const withPlan = periodTasks.filter((t) => (t.estimatedMinutes ?? 0) > 0);

    const plannedCount = withPlan.length > 0 ? withPlan.length : periodTasks.length;
    const plannedMinutes = withPlan.reduce(
      (s, t) => s + (t.estimatedMinutes ?? 0),
      0,
    );

    const doneInPeriod = periodTasks.filter((t) => t.taskStatus === TaskStatus.DONE);
    const achievedCount = doneInPeriod.length;
    const achievedMinutes = doneInPeriod.reduce(
      (s, t) =>
        s +
        (t.timeSpentMinutes > 0
          ? t.timeSpentMinutes
          : (t.estimatedMinutes ?? 0)),
      0,
    );

    const ongoingCount = periodTasks.filter((t) =>
      [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED].includes(
        t.taskStatus,
      ),
    ).length;

    const endStr = format(range.end, 'yyyy-MM-dd');
    const missedCount = periodTasks.filter((t) => {
      if (t.taskStatus === TaskStatus.DONE) return false;
      if (!t.dueDate) return false;
      const d = format(new Date(t.dueDate), 'yyyy-MM-dd');
      return d < endStr && t.dueDate < range.end;
    }).length;

    return {
      plannedCount,
      achievedCount,
      missedCount,
      ongoingCount,
      plannedMinutes,
      achievedMinutes,
      fulfillmentRate: rate(achievedMinutes, plannedMinutes),
    };
  }

  private buildReports(
    logs: ActivityLog[],
    finishedTasks: Task[],
    habitLogs: HabitLog[],
    habitNames: Map<string, string>,
  ): AchievementReport[] {
    const moduleLabels: Record<string, string> = {
      [ActivityModule.TASKS]: 'Tasks',
      [ActivityModule.GOALS]: 'Goals',
      [ActivityModule.HABITS]: 'Habits',
      [ActivityModule.LEARNING]: 'Learning',
      [ActivityModule.FINANCE]: 'Finance',
      [ActivityModule.DAILY_REVIEWS]: 'Daily Reviews',
      [ActivityModule.ENGLISH]: 'English',
      [ActivityModule.SPIRITUAL]: 'Spiritual',
      [ActivityModule.HEALTH]: 'Health',
      [ActivityModule.JOURNAL]: 'Journal',
    };

    const fromLogs: AchievementReport[] = logs.map((log) => ({
      id: log.id,
      module: log.module,
      moduleLabel: moduleLabels[log.module] ?? log.module,
      title:
        (log.description as string) ??
        `${log.action} ${log.entityType}`,
      status:
        log.action === ActivityAction.COMPLETED
          ? AchievementStatus.ACHIEVED
          : AchievementStatus.FINISHED,
      finishedAt: log.createdAt.toISOString(),
      description: log.description ?? undefined,
    }));

    const fromTasks: AchievementReport[] = finishedTasks.map((t) => {
      const planned = t.estimatedMinutes ?? 0;
      const achieved = t.timeSpentMinutes ?? 0;
      return {
        id: `task-${t.id}`,
        module: ActivityModule.TASKS,
        moduleLabel: 'Tasks',
        title: t.title,
        status:
          planned > 0 && achieved >= planned
            ? AchievementStatus.ACHIEVED
            : AchievementStatus.FINISHED,
        finishedAt: (t.completedAt ?? t.updatedAt).toISOString(),
        description:
          planned > 0
            ? `Planned ${planned} min · Achieved ${achieved} min`
            : achieved > 0
              ? `Achieved ${achieved} min`
              : 'Task completed',
      };
    });

    const fromHabits: AchievementReport[] = habitLogs.map((l) => ({
      id: `habit-${l.id}`,
      module: ActivityModule.HABITS,
      moduleLabel: 'Habits',
      title: habitNames.get(l.habitId) ?? 'Habit logged',
      status: AchievementStatus.FINISHED,
      finishedAt: l.completedAt.toISOString(),
      description: 'Habit check-in',
    }));

    return [...fromTasks, ...fromLogs, ...fromHabits]
      .sort(
        (a, b) =>
          new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime(),
      )
      .slice(0, 30);
  }
}
