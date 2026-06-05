import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  addDays,
  differenceInCalendarDays,
  format,
  getDate,
  getDaysInMonth,
  startOfDay,
} from 'date-fns';
import { Between, In, Repository } from 'typeorm';
import { habitLogsInRange } from '../../../../common/utils/habit-logs.util';
import { AnalyticsPeriod } from '../../../../common/domain/enums/period.enum';
import { LifeArea } from '../../../../common/domain/enums/life-area.enum';
import { DateRangeQueryDto } from '../../../../common/dto/date-range.dto';
import { resolveDateRange } from '../../../../common/utils/date-range.util';
import { FinanceAccount } from '../../../finance/domain/entities/account.entity';
import { ExpenseCategory } from '../../../finance/domain/entities/expense-category.entity';
import { IncomeCategory } from '../../../finance/domain/entities/income-category.entity';
import { FinanceTransaction } from '../../../finance/domain/entities/transaction.entity';
import { TransactionType } from '../../../finance/domain/enums/finance.enums';
import { Goal } from '../../../goals/domain/entities/goal.entity';
import { Habit } from '../../../habits/domain/entities/habit.entity';
import { StudySession } from '../../../learning/domain/entities/study-session.entity';
import { Task } from '../../../tasks/domain/entities/task.entity';
import { TaskStatus } from '../../../tasks/domain/enums/task.enums';

function toNum(v: unknown): number {
  return Number(v ?? 0);
}

const OPEN_STATUSES = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.BLOCKED,
];

function isOverdue(task: Task, now = new Date()): boolean {
  if (!task.dueDate) return false;
  if (task.taskStatus === TaskStatus.DONE || task.taskStatus === TaskStatus.CANCELLED) {
    return false;
  }
  return new Date(task.dueDate) < now;
}

function effectiveStatus(task: Task, now = new Date()): string {
  if (isOverdue(task, now)) return 'overdue';
  if (task.taskStatus === TaskStatus.TODO) return 'pending';
  if (task.taskStatus === TaskStatus.IN_PROGRESS) return 'in_progress';
  if (task.taskStatus === TaskStatus.DONE) return 'completed';
  return task.taskStatus;
}

@Injectable()
export class LifeIntelligenceService {
  constructor(
    @InjectRepository(Task) private readonly tasksRepo: Repository<Task>,
    @InjectRepository(Goal) private readonly goalsRepo: Repository<Goal>,
    @InjectRepository(Habit) private readonly habitsRepo: Repository<Habit>,
    @InjectRepository(FinanceTransaction)
    private readonly txRepo: Repository<FinanceTransaction>,
    @InjectRepository(FinanceAccount)
    private readonly accountsRepo: Repository<FinanceAccount>,
    @InjectRepository(ExpenseCategory)
    private readonly expenseCatRepo: Repository<ExpenseCategory>,
    @InjectRepository(IncomeCategory)
    private readonly incomeCatRepo: Repository<IncomeCategory>,
    @InjectRepository(StudySession)
    private readonly studyRepo: Repository<StudySession>,
  ) {}

  async getFinanceIntelligence(userId: string, query?: DateRangeQueryDto) {
    const monthRange = resolveDateRange(
      query?.period ?? AnalyticsPeriod.MONTH,
      query?.startDate,
      query?.endDate,
    );
    const weekRange = resolveDateRange(AnalyticsPeriod.WEEK);
    const now = new Date();

    const monthBetween = Between(
      format(monthRange.start, 'yyyy-MM-dd'),
      format(monthRange.end, 'yyyy-MM-dd'),
    );
    const weekBetween = Between(
      format(weekRange.start, 'yyyy-MM-dd'),
      format(weekRange.end, 'yyyy-MM-dd'),
    );

    const [monthTx, weekTx, accounts, expenseCats, incomeCats] = await Promise.all([
      this.txRepo.find({
        where: { createdBy: userId, transactionDate: monthBetween },
        relations: { account: true },
        order: { transactionDate: 'ASC' },
      }),
      this.txRepo.find({
        where: { createdBy: userId, transactionDate: weekBetween },
        relations: { account: true },
      }),
      this.accountsRepo.find({ where: { createdBy: userId } }),
      this.expenseCatRepo.find({ where: { createdBy: userId } }),
      this.incomeCatRepo.find({ where: { createdBy: userId } }),
    ]);

    const aggregate = (txs: FinanceTransaction[]) => {
      let income = 0;
      let expense = 0;
      const byCategory = new Map<string, number>();
      for (const tx of txs) {
        const amt = toNum(tx.amount);
        if (tx.transactionType === TransactionType.INCOME) {
          income += amt;
        } else if (tx.transactionType === TransactionType.EXPENSE) {
          expense += amt;
          const key = tx.categoryId ?? 'uncategorized';
          byCategory.set(key, (byCategory.get(key) ?? 0) + amt);
        }
      }
      return { income, expense, net: income - expense, byCategory };
    };

    const month = aggregate(monthTx);
    const week = aggregate(weekTx);
    const savingsRate =
      month.income > 0 ? Math.round((month.net / month.income) * 1000) / 10 : 0;

    const daysElapsed = Math.max(1, differenceInCalendarDays(now, monthRange.start) + 1);
    const daysInMonth = getDaysInMonth(now);
    const burnRate = Math.round((month.expense / daysElapsed) * 100) / 100;
    const forecastExpense = Math.round(burnRate * daysInMonth * 100) / 100;
    const forecastNet = Math.round((month.income - forecastExpense) * 100) / 100;

    const catName = (id: string) => {
      if (id === 'uncategorized') return 'Uncategorized';
      return (
        expenseCats.find((c) => c.id === id)?.name ??
        incomeCats.find((c) => c.id === id)?.name ??
        'Unknown'
      );
    };

    const spendingByCategory = [...month.byCategory.entries()]
      .map(([id, amount]) => ({
        categoryId: id,
        name: catName(id),
        amount,
        percentOfExpense:
          month.expense > 0 ? Math.round((amount / month.expense) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const topOverspend = spendingByCategory[0] ?? null;
    const currency =
      monthTx.find((t) => t.currency)?.currency ??
      accounts[0]?.currency ??
      'ETB';

    return {
      currency,
      monthly: {
        income: month.income,
        expense: month.expense,
        netBalance: month.net,
        savingsRate,
      },
      weekly: {
        income: week.income,
        expense: week.expense,
        netBalance: week.net,
      },
      burnRate,
      forecast: {
        endOfMonthExpense: forecastExpense,
        endOfMonthNet: forecastNet,
        daysRemaining: daysInMonth - getDate(now),
      },
      spendingByCategory,
      topOverspendCategory: topOverspend?.name ?? null,
      accountBalance: accounts.reduce((s, a) => s + toNum(a.balance), 0),
      transactionCount: monthTx.length,
    };
  }

  async getTaskIntelligence(userId: string) {
    const now = new Date();
    const dayRange = resolveDateRange(AnalyticsPeriod.DAY);
    const weekRange = resolveDateRange(AnalyticsPeriod.WEEK);
    const monthRange = resolveDateRange(AnalyticsPeriod.MONTH);

    const [allOpen, completedWeek, completedMonth] = await Promise.all([
      this.tasksRepo.find({
        where: { createdBy: userId, taskStatus: In(OPEN_STATUSES) },
        order: { dueDate: 'ASC', priority: 'DESC' },
      }),
      this.tasksRepo.find({
        where: {
          createdBy: userId,
          taskStatus: TaskStatus.DONE,
          completedAt: Between(weekRange.start, weekRange.end),
        },
      }),
      this.tasksRepo.find({
        where: {
          createdBy: userId,
          taskStatus: TaskStatus.DONE,
          completedAt: Between(monthRange.start, monthRange.end),
        },
      }),
    ]);

    const overdue = allOpen.filter((t) => isOverdue(t, now));
    const dueToday = allOpen.filter((t) => {
      if (!t.dueDate) return false;
      const d = startOfDay(new Date(t.dueDate));
      return d >= startOfDay(dayRange.start) && d <= startOfDay(dayRange.end);
    });

    const monthDone = completedMonth.length;
    const pipelineTotal = monthDone + allOpen.length;
    const completionRate =
      pipelineTotal > 0
        ? Math.round((monthDone / pipelineTotal) * 1000) / 10
        : 0;

    const overdueRatio =
      allOpen.length > 0
        ? Math.round((overdue.length / allOpen.length) * 1000) / 10
        : 0;

    const plannedMinutes = completedMonth.reduce(
      (s, t) => s + (t.estimatedMinutes ?? 0),
      0,
    );
    const actualMinutes = completedMonth.reduce(
      (s, t) => s + (t.timeSpentMinutes ?? 0),
      0,
    );
    const timeAccuracy =
      plannedMinutes > 0
        ? Math.round((actualMinutes / plannedMinutes) * 1000) / 10
        : actualMinutes > 0
          ? 100
          : 0;

    const productivityScore = Math.round(
      completionRate * 0.45 +
        Math.max(0, 100 - overdueRatio * 2) * 0.35 +
        Math.min(timeAccuracy, 100) * 0.2,
    );

    const dailyVelocity =
      weekRange.start && weekRange.end
        ? Math.round((completedWeek.length / 7) * 10) / 10
        : 0;

    const weeklyTrend: { day: string; completed: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekRange.start, i);
      const dayStr = format(d, 'yyyy-MM-dd');
      const count = completedWeek.filter(
        (t) => t.completedAt && format(new Date(t.completedAt), 'yyyy-MM-dd') === dayStr,
      ).length;
      weeklyTrend.push({ day: format(d, 'EEE'), completed: count });
    }

    const byLifeArea = new Map<string, { open: number; overdue: number }>();
    for (const t of allOpen) {
      const area = t.lifeArea ?? LifeArea.PERSONAL;
      const cur = byLifeArea.get(area) ?? { open: 0, overdue: 0 };
      cur.open += 1;
      if (isOverdue(t, now)) cur.overdue += 1;
      byLifeArea.set(area, cur);
    }

    return {
      focusToday: dueToday.slice(0, 8).map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        lifeArea: t.lifeArea ?? null,
        status: effectiveStatus(t, now),
        dueDate: t.dueDate ?? null,
        estimatedMinutes: t.estimatedMinutes ?? null,
      })),
      overdue: overdue.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        lifeArea: t.lifeArea ?? null,
        daysOverdue: t.dueDate
          ? differenceInCalendarDays(now, new Date(t.dueDate))
          : 0,
      })),
      metrics: {
        openCount: allOpen.length,
        overdueCount: overdue.length,
        completionRate,
        overdueRatio,
        productivityScore,
        dailyVelocity,
        completedThisWeek: completedWeek.length,
        completedThisMonth: completedMonth.length,
      },
      weeklyCompletionTrend: weeklyTrend,
      byLifeArea: [...byLifeArea.entries()].map(([area, v]) => ({
        lifeArea: area,
        ...v,
      })),
    };
  }

  async getUnifiedIntelligence(userId: string, query?: DateRangeQueryDto) {
    const now = new Date();
    const dayRange = resolveDateRange(AnalyticsPeriod.DAY);
    const weekRange = resolveDateRange(AnalyticsPeriod.WEEK);
    const monthRange = resolveDateRange(AnalyticsPeriod.MONTH);

    const [finance, tasks, goals, habits, studyToday] =
      await Promise.all([
        this.getFinanceIntelligence(userId, query),
        this.getTaskIntelligence(userId),
        this.goalsRepo.find({
          where: { createdBy: userId },
          order: { updatedAt: 'DESC' },
          take: 15,
        }),
        this.habitsRepo.find({
          where: { createdBy: userId },
          relations: { logs: true },
          take: 30,
        }),
        this.studyRepo.find({
          where: {
            createdBy: userId,
            sessionDate: Between(
              format(dayRange.start, 'yyyy-MM-dd'),
              format(dayRange.end, 'yyyy-MM-dd'),
            ),
          },
        }),
      ]);

    const habitLogsToday = habitLogsInRange(
      habits,
      dayRange.start,
      dayRange.end,
    );
    const loggedHabitIds = new Set(habitLogsToday.map((l) => l.habitId));
    const habitCompletionToday =
      habits.length > 0
        ? Math.round((loggedHabitIds.size / habits.length) * 1000) / 10
        : 0;

    const financialHealthScore = Math.round(
      Math.min(finance.monthly.savingsRate, 100) * 0.5 +
        (finance.monthly.netBalance >= 0 ? 30 : 0) +
        (finance.forecast.endOfMonthNet >= 0 ? 20 : 0),
    );

    const productivityScore = tasks.metrics.productivityScore;

    const dailySummary = this.buildDailySummary({
      finance,
      tasks,
      habitCompletionToday,
      studyMinutes: studyToday.reduce((s, x) => s + (x.durationMinutes ?? 0), 0),
    });

    const weeklyPerformance = {
      tasksCompleted: tasks.metrics.completedThisWeek,
      weeklyNet: finance.weekly.netBalance,
      weeklyExpense: finance.weekly.expense,
      productivityScore,
      financialHealthScore,
    };

    const monthlyTrend = {
      income: finance.monthly.income,
      expense: finance.monthly.expense,
      net: finance.monthly.netBalance,
      savingsRate: finance.monthly.savingsRate,
      taskCompletionRate: tasks.metrics.completionRate,
      forecastEndOfMonthNet: finance.forecast.endOfMonthNet,
    };

    const aiInsight = this.generateAiInsight({
      finance,
      tasks,
      productivityScore,
      financialHealthScore,
    });

    return {
      generatedAt: now.toISOString(),
      meta: {
        today: format(now, 'yyyy-MM-dd'),
        currency: finance.currency,
        weekRange: {
          start: format(weekRange.start, 'yyyy-MM-dd'),
          end: format(weekRange.end, 'yyyy-MM-dd'),
        },
        monthRange: {
          start: format(monthRange.start, 'yyyy-MM-dd'),
          end: format(monthRange.end, 'yyyy-MM-dd'),
        },
      },
      scores: {
        productivityScore,
        financialHealthScore,
      },
      dailySummary,
      weeklyPerformance,
      monthlyTrend,
      finance,
      tasks,
      goals: goals.map((g) => ({
        id: g.id,
        title: g.title,
        progress: g.progress ?? 0,
        lifeArea: g.lifeArea ?? null,
        targetDate: g.targetDate ?? null,
      })),
      habits: {
        total: habits.length,
        loggedToday: loggedHabitIds.size,
        completionRateToday: habitCompletionToday,
      },
      learning: {
        studyMinutesToday: studyToday.reduce(
          (s, x) => s + (x.durationMinutes ?? 0),
          0,
        ),
        sessionsToday: studyToday.length,
      },
      aiInsight,
    };
  }

  /** Structured context for AI — reads all domains, stores nothing. */
  async buildAiContext(userId: string) {
    const intelligence = await this.getUnifiedIntelligence(userId);
    const [accounts, recentTx] = await Promise.all([
      this.accountsRepo.find({ where: { createdBy: userId }, take: 10 }),
      this.txRepo.find({
        where: { createdBy: userId },
        order: { transactionDate: 'DESC', createdAt: 'DESC' },
        take: 40,
      }),
    ]);

    return {
      profile: {
        primaryCurrency: intelligence.meta.currency,
        today: intelligence.meta.today,
      },
      intelligence: {
        dailySummary: intelligence.dailySummary,
        weeklyPerformance: intelligence.weeklyPerformance,
        monthlyTrend: intelligence.monthlyTrend,
        scores: intelligence.scores,
        aiInsight: intelligence.aiInsight,
      },
      tasks: {
        focusToday: intelligence.tasks.focusToday,
        overdue: intelligence.tasks.overdue,
        metrics: intelligence.tasks.metrics,
        weeklyCompletionTrend: intelligence.tasks.weeklyCompletionTrend,
        byLifeArea: intelligence.tasks.byLifeArea,
      },
      finance: {
        ...intelligence.finance,
        accounts: accounts.map((a) => ({
          name: a.name,
          balance: toNum(a.balance),
          currency: a.currency,
        })),
        recentTransactions: recentTx.slice(0, 20).map((tx) => ({
          type: tx.transactionType,
          amount: toNum(tx.amount),
          currency: tx.currency,
          date: tx.transactionDate,
          incomeSource: tx.incomeSource ?? null,
          paymentMethod: tx.paymentMethod ?? null,
          linkedTaskId: tx.linkedTaskId ?? null,
          description: tx.description?.slice(0, 80) ?? null,
        })),
      },
      goals: intelligence.goals,
      habits: intelligence.habits,
      learning: intelligence.learning,
    };
  }

  private buildDailySummary(input: {
    finance: Awaited<ReturnType<LifeIntelligenceService['getFinanceIntelligence']>>;
    tasks: Awaited<ReturnType<LifeIntelligenceService['getTaskIntelligence']>>;
    habitCompletionToday: number;
    studyMinutes: number;
  }): string {
    const parts: string[] = [];
    parts.push(
      `${input.tasks.focusToday.length} focus task(s), ${input.tasks.overdue.length} overdue.`,
    );
    parts.push(
      `Spent ${input.finance.weekly.expense} ${input.finance.currency} this week; net ${input.finance.weekly.netBalance}.`,
    );
    if (input.habitCompletionToday > 0) {
      parts.push(`Habits ${input.habitCompletionToday}% done today.`);
    }
    if (input.studyMinutes > 0) {
      parts.push(`${input.studyMinutes} min learning today.`);
    }
    return parts.join(' ');
  }

  private generateAiInsight(input: {
    finance: Awaited<ReturnType<LifeIntelligenceService['getFinanceIntelligence']>>;
    tasks: Awaited<ReturnType<LifeIntelligenceService['getTaskIntelligence']>>;
    productivityScore: number;
    financialHealthScore: number;
  }): string {
    const lines: string[] = [];

    if (input.tasks.overdue.length > 0) {
      lines.push(
        `You have ${input.tasks.overdue.length} overdue task(s) — tackle "${input.tasks.overdue[0]?.title}" first.`,
      );
    } else if (input.tasks.focusToday.length > 0) {
      lines.push(
        `Focus on "${input.tasks.focusToday[0]?.title}" among ${input.tasks.focusToday.length} task(s) due today.`,
      );
    } else {
      lines.push('No urgent tasks due today — good window for goals or habits.');
    }

    if (input.finance.monthly.savingsRate < 10 && input.finance.monthly.expense > 0) {
      lines.push(
        `Savings rate is ${input.finance.monthly.savingsRate}%${input.finance.topOverspendCategory ? `; watch spending on ${input.finance.topOverspendCategory}.` : '.'}`,
      );
    } else if (input.finance.forecast.endOfMonthNet >= 0) {
      lines.push(
        `On track for month-end with ~${input.finance.forecast.endOfMonthNet} ${input.finance.currency} projected net.`,
      );
    }

    if (lines.length < 2) {
      lines.push(
        `Productivity ${input.productivityScore}/100 · Financial health ${input.financialHealthScore}/100.`,
      );
    }

    return lines.slice(0, 2).join(' ');
  }
}
