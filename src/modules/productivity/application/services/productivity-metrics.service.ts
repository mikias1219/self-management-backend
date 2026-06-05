import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { habitLogsInRange } from '../../../../common/utils/habit-logs.util';
import {
  eachDayOfInterval,
  endOfDay,
  format,
  isAfter,
  min,
  startOfDay,
} from 'date-fns';
import { AnalyticsPeriod } from '../../../../common/domain/enums/period.enum';
import { resolveDateRange } from '../../../../common/utils/date-range.util';
import { Goal } from '../../../goals/domain/entities/goal.entity';
import { GoalLevel } from '../../../goals/domain/enums/goal.enums';
import { Habit } from '../../../habits/domain/entities/habit.entity';
import type { HabitLog } from '../../../habits/domain/entities/habit-log.entity';
import { Task } from '../../../tasks/domain/entities/task.entity';
import { TaskStatus } from '../../../tasks/domain/enums/task.enums';
import type {
  PeriodProductivityMetrics,
  PeriodTrendPoint,
} from '../dto/productivity-metrics.dto';

@Injectable()
export class ProductivityMetricsService {
  constructor(
    @InjectRepository(Task) private readonly tasksRepo: Repository<Task>,
    @InjectRepository(Goal) private readonly goalsRepo: Repository<Goal>,
    @InjectRepository(Habit) private readonly habitsRepo: Repository<Habit>,
  ) {}

  async getAllPeriods(userId: string) {
    const periods = [
      AnalyticsPeriod.DAY,
      AnalyticsPeriod.WEEK,
      AnalyticsPeriod.MONTH,
      AnalyticsPeriod.YEAR,
    ];
    const metrics = await Promise.all(
      periods.map((p) => this.getForPeriod(userId, p)),
    );
    return {
      daily: metrics[0],
      weekly: metrics[1],
      monthly: metrics[2],
      yearly: metrics[3],
    };
  }

  async getForPeriod(
    userId: string,
    period: AnalyticsPeriod,
  ): Promise<PeriodProductivityMetrics> {
    const range = resolveDateRange(period);
    const now = new Date();
    const effectiveEnd = min([range.end, endOfDay(now)]);

    const [tasksInRange, goalsInRange, habits] = await Promise.all([
      this.tasksRepo.find({
        where: { createdBy: userId },
        relations: { goal: true, habit: true },
        order: { updatedAt: 'DESC' },
      }),
      this.goalsRepo.find({ where: { createdBy: userId } }),
      this.habitsRepo.find({
        where: { createdBy: userId },
        relations: { logs: true },
      }),
    ]);

    const habitLogs = habitLogsInRange(habits, range.start, range.end);

    const taskAnchor = (t: Task) => {
      const raw = t.scheduledAt ?? t.dueDate ?? t.startDate;
      return raw ? new Date(raw) : null;
    };

    const inRange = (d: Date) => d >= range.start && d <= range.end;

    const completedInPeriod = tasksInRange.filter(
      (t) =>
        t.taskStatus === TaskStatus.DONE &&
        t.completedAt &&
        inRange(new Date(t.completedAt)),
    );

    const dueInPeriod = tasksInRange.filter((t) => {
      if (t.taskStatus === TaskStatus.CANCELLED) return false;
      const anchor = taskAnchor(t);
      return anchor ? inRange(anchor) : false;
    });

    const plannedIds = new Set([
      ...dueInPeriod.map((t) => t.id),
      ...completedInPeriod.map((t) => t.id),
    ]);
    const tasksFiltered = tasksInRange.filter((t) => plannedIds.has(t.id));

    const completed = completedInPeriod;
    const open = tasksFiltered.filter(
      (t) =>
        t.taskStatus !== TaskStatus.DONE &&
        t.taskStatus !== TaskStatus.CANCELLED,
    );
    const overdue = open.filter(
      (t) => t.dueDate && new Date(t.dueDate) < startOfDay(now),
    );

    const plannedMinutes = tasksFiltered.reduce(
      (s, t) => s + (t.estimatedMinutes ?? 0),
      0,
    );
    const spentMinutes = completed.reduce(
      (s, t) =>
        s +
        (t.timeSpentMinutes > 0
          ? t.timeSpentMinutes
          : (t.estimatedMinutes ?? 0)),
      0,
    );

    const plannedCount = plannedIds.size;
    const completionRate =
      plannedCount > 0
        ? Math.round((completed.length / plannedCount) * 1000) / 10
        : completed.length > 0
          ? 100
          : 0;

    const goalsFiltered = goalsInRange.filter((g) => {
      if (!g.targetDate) return true;
      const d = new Date(g.targetDate);
      return d >= range.start && d <= range.end;
    });

    const byLevel: Record<string, number> = {};
    for (const level of Object.values(GoalLevel)) {
      byLevel[level] = goalsFiltered.filter((g) => g.level === level).length;
    }

    const avgProgress =
      goalsFiltered.length > 0
        ? Math.round(
            (goalsFiltered.reduce((s, g) => s + (g.progress ?? 0), 0) /
              goalsFiltered.length) *
              10,
          ) / 10
        : 0;

    const habitDays = Math.max(
      1,
      Math.ceil(
        (effectiveEnd.getTime() - range.start.getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1,
    );
    const targetLogs = habits.length * habitDays;
    const habitCompletionRate =
      targetLogs > 0
        ? Math.round((habitLogs.length / targetLogs) * 1000) / 10
        : 0;

    const taskScore = completionRate;
    const goalScore = avgProgress;
    const habitScore = Math.min(100, habitCompletionRate);
    const dimensions = [taskScore, goalScore, habitScore].filter(
      (s, i) =>
        (i === 0 && plannedCount > 0) ||
        (i === 1 && goalsFiltered.length > 0) ||
        (i === 2 && habits.length > 0),
    );
    const successScore =
      dimensions.length > 0
        ? Math.round(
            dimensions.reduce((a, b) => a + b, 0) / dimensions.length,
          )
        : 0;

    const trend = this.buildTrend(
      range.start,
      effectiveEnd,
      tasksInRange,
      habitLogs,
    );

    return {
      period,
      range: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      },
      successScore,
      tasks: {
        total: plannedCount,
        completed: completed.length,
        open: open.length,
        overdue: overdue.length,
        completionRate,
        plannedMinutes,
        spentMinutes,
        dueInPeriod: dueInPeriod.length,
        completedInPeriod: completed.length,
      },
      goals: {
        active: goalsFiltered.length,
        avgProgress,
        completed: goalsFiltered.filter((g) => (g.progress ?? 0) >= 100).length,
        byLevel,
      },
      habits: {
        totalHabits: habits.length,
        logsCount: habitLogs.length,
        completionRate: Math.min(100, habitCompletionRate),
        targetLogs,
      },
      trend,
    };
  }

  private buildTrend(
    rangeStart: Date,
    rangeEnd: Date,
    tasks: Task[],
    habitLogs: HabitLog[],
  ): PeriodTrendPoint[] {
    if (isAfter(rangeStart, rangeEnd)) return [];

    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    return days.map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const dateStr = format(day, 'yyyy-MM-dd');

      let planned = 0;
      let completed = 0;
      for (const t of tasks) {
        if (t.taskStatus === TaskStatus.CANCELLED) continue;
        const anchorRaw = t.scheduledAt ?? t.dueDate ?? t.startDate;
        if (anchorRaw) {
          const anchor = new Date(anchorRaw);
          if (anchor >= dayStart && anchor <= dayEnd) planned += 1;
        }
        if (
          t.taskStatus === TaskStatus.DONE &&
          t.completedAt &&
          new Date(t.completedAt) >= dayStart &&
          new Date(t.completedAt) <= dayEnd
        ) {
          completed += 1;
        }
      }

      const habitLogsDay = habitLogs.filter((l) => {
        const at = new Date(l.completedAt);
        return at >= dayStart && at <= dayEnd;
      }).length;

      return {
        date: dateStr,
        completed,
        planned,
        habitLogs: habitLogsDay,
      };
    });
  }
}
