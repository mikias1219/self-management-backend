import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays, endOfDay, format, startOfDay } from 'date-fns';
import { Repository } from 'typeorm';
import { habitLogsInRange } from '../../../../common/utils/habit-logs.util';
import { DailyReview } from '../../../daily-reviews/domain/entities/daily-review.entity';
import { Goal } from '../../../goals/domain/entities/goal.entity';
import { Habit } from '../../../habits/domain/entities/habit.entity';
import { GoogleCalendarService } from '../../../integrations/application/services/google-calendar.service';
import { IcalCalendarService } from '../../../integrations/application/services/ical-calendar.service';
import { Task } from '../../../tasks/domain/entities/task.entity';
import { TaskStatus } from '../../../tasks/domain/enums/task.enums';
import type {
  ProductivitySchedule,
  ScheduleItem,
} from '../dto/productivity-schedule.dto';

@Injectable()
export class ProductivityScheduleService {
  constructor(
    @InjectRepository(Task) private readonly tasksRepo: Repository<Task>,
    @InjectRepository(Goal) private readonly goalsRepo: Repository<Goal>,
    @InjectRepository(Habit) private readonly habitsRepo: Repository<Habit>,
    @InjectRepository(DailyReview) private readonly reviewsRepo: Repository<DailyReview>,
    private readonly icalCalendar: IcalCalendarService,
    private readonly googleCalendar: GoogleCalendarService,
  ) {}

  async getSchedule(
    userId: string,
    days = 1,
    scope: 'today' | 'upcoming' = 'today',
  ): Promise<ProductivitySchedule> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const rangeStart = scope === 'today' ? todayStart : todayStart;
    const rangeEnd =
      scope === 'today' ? todayEnd : endOfDay(addDays(now, days));
    const todayStr = format(now, 'yyyy-MM-dd');
    const fetchDays = scope === 'today' ? 1 : days;

    const [
      tasks,
      goals,
      habits,
      reviewToday,
      calendar,
      gcStatus,
      googleApiEvents,
    ] = await Promise.all([
        this.tasksRepo.find({
          where: { createdBy: userId },
          order: { dueDate: 'ASC', scheduledAt: 'ASC', createdAt: 'DESC' },
        }),
        this.goalsRepo.find({
          where: { createdBy: userId },
          order: { targetDate: 'ASC', updatedAt: 'DESC' },
        }),
        this.habitsRepo.find({
          where: { createdBy: userId },
          relations: { logs: true },
          order: { name: 'ASC' },
        }),
        this.reviewsRepo.find({
          where: { createdBy: userId, reviewDate: todayStr },
          take: 1,
        }),
        this.icalCalendar.getUpcomingEvents(userId, fetchDays).catch(() => ({
          configured: false,
          timezone: 'Africa/Nairobi',
          embedSrc: null,
          events: [],
        })),
        this.googleCalendar.getStatus(userId),
        this.googleCalendar
          .listEventsInRange(userId, rangeStart, rangeEnd)
          .catch(() => []),
      ]);

    const calendarEvents =
      gcStatus.syncReady && googleApiEvents.length > 0
        ? googleApiEvents
        : calendar.events;

    const syncedGoogleEventIds = new Set(
      tasks
        .map((t) => t.googleCalendarEventId)
        .filter((id): id is string => !!id),
    );

    const habitLogsToday = habitLogsInRange(habits, todayStart, todayEnd);
    const loggedHabitIds = new Set(habitLogsToday.map((l) => l.habitId));
    const items: ScheduleItem[] = [];

    const isToday = (d: Date) => d >= rangeStart && d <= rangeEnd;
    const onCalendarDay = (d: Date) => format(d, 'yyyy-MM-dd') === todayStr;

    for (const task of tasks) {
      if (task.taskStatus === TaskStatus.CANCELLED) continue;

      const anchor = task.scheduledAt ?? task.dueDate ?? task.startDate;
      const completedToday =
        task.taskStatus === TaskStatus.DONE &&
        task.completedAt &&
        onCalendarDay(new Date(task.completedAt));

      if (!anchor && !completedToday) continue;

      const start = anchor ? new Date(anchor) : todayStart;
      if (
        scope === 'today' &&
        !completedToday &&
        !onCalendarDay(start)
      ) {
        continue;
      }
      if (scope === 'upcoming' && start > rangeEnd) continue;
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + (task.estimatedMinutes ?? 60));

      items.push({
        id: `task-${task.id}`,
        kind: 'task',
        title: task.title,
        start: start.toISOString(),
        end: end.toISOString(),
        status: task.taskStatus,
        entityId: task.id,
        syncedToCalendar: !!task.googleCalendarEventId,
        measurable: {
          plannedMinutes: task.estimatedMinutes ?? undefined,
          spentMinutes: task.timeSpentMinutes ?? undefined,
        },
        meta: {
          priority: task.priority,
          goalId: task.goalId ?? null,
          overdue:
            task.dueDate &&
            new Date(task.dueDate) < now &&
            task.taskStatus !== TaskStatus.DONE
              ? 1
              : 0,
        },
      });
    }

    for (const goal of goals) {
      if (!goal.targetDate) continue;
      const start = startOfDay(new Date(goal.targetDate));
      if (!isToday(start) && scope === 'today') continue;
      if (start < rangeStart || start > rangeEnd) continue;
      items.push({
        id: `goal-${goal.id}`,
        kind: 'goal',
        title: goal.title,
        start: start.toISOString(),
        end: endOfDay(start).toISOString(),
        allDay: true,
        progress: goal.progress ?? 0,
        entityId: goal.id,
        syncedToCalendar: !!goal.googleCalendarEventId,
        meta: { level: goal.level },
      });
    }

    for (const habit of habits) {
      const habitStart = startOfDay(now);
      habitStart.setHours(8, 0, 0, 0);
      const logged = loggedHabitIds.has(habit.id);
      items.push({
        id: `habit-${habit.id}`,
        kind: 'habit',
        title: habit.name,
        start: habitStart.toISOString(),
        end: new Date(habitStart.getTime() + 30 * 60 * 1000).toISOString(),
        status: logged ? 'done' : 'todo',
        entityId: habit.id,
        syncedToCalendar: !!habit.googleCalendarEventId,
        measurable: { streak: habit.currentStreak },
        meta: { frequency: habit.frequency },
      });
    }

    if (reviewToday[0]) {
      const r = reviewToday[0];
      const reviewStart = startOfDay(now);
      reviewStart.setHours(20, 0, 0, 0);
      items.push({
        id: `review-${r.id}`,
        kind: 'review',
        title: 'Daily review',
        start: reviewStart.toISOString(),
        end: new Date(reviewStart.getTime() + 45 * 60 * 1000).toISOString(),
        status: 'done',
        entityId: r.id,
        meta: {
          moodScore: r.moodScore ?? null,
          productivityScore: r.productivityScore ?? null,
        },
      });
    } else {
      const reviewStart = startOfDay(now);
      reviewStart.setHours(20, 0, 0, 0);
      items.push({
        id: `review-pending-${todayStr}`,
        kind: 'review',
        title: 'Daily review (not done)',
        start: reviewStart.toISOString(),
        end: new Date(reviewStart.getTime() + 45 * 60 * 1000).toISOString(),
        status: 'todo',
        entityId: todayStr,
      });
    }

    for (const ev of calendarEvents) {
      if (syncedGoogleEventIds.has(ev.uid)) continue;

      const evStart = new Date(ev.start);
      if (scope === 'today' && !onCalendarDay(evStart)) continue;
      items.push({
        id: `cal-${ev.uid}`,
        kind: 'calendar',
        title: ev.title,
        start: ev.start,
        end: ev.end,
        allDay: ev.allDay,
        entityId: ev.uid,
        meta: {
          recurring: ev.recurring ? 1 : 0,
          source: gcStatus.syncReady ? 'google_api' : 'ical',
        },
      });
    }

    items.sort((a, b) => a.start.localeCompare(b.start));

    const openTasks = tasks.filter(
      (t) =>
        t.taskStatus !== TaskStatus.DONE &&
        t.taskStatus !== TaskStatus.CANCELLED,
    );
    const dueToday = openTasks.filter((t) => {
      const d = t.dueDate ?? t.scheduledAt;
      return d && format(new Date(d), 'yyyy-MM-dd') === todayStr;
    });

    const todayTasks = tasks.filter((t) => {
      const anchor = t.scheduledAt ?? t.dueDate ?? t.startDate;
      const onCalendar =
        anchor && format(new Date(anchor), 'yyyy-MM-dd') === todayStr;
      const doneToday =
        t.taskStatus === TaskStatus.DONE &&
        t.completedAt &&
        format(new Date(t.completedAt), 'yyyy-MM-dd') === todayStr;
      return onCalendar || doneToday;
    });

    const completedToday = todayTasks.filter(
      (t) => t.taskStatus === TaskStatus.DONE,
    );
    const plannedToday = todayTasks.filter(
      (t) =>
        t.taskStatus !== TaskStatus.DONE &&
        t.taskStatus !== TaskStatus.CANCELLED,
    );
    const minutesPlanned = todayTasks.reduce(
      (s, t) => s + (t.estimatedMinutes ?? 0),
      0,
    );
    const minutesAchieved = completedToday.reduce(
      (s, t) =>
        s +
        (t.timeSpentMinutes > 0
          ? t.timeSpentMinutes
          : (t.estimatedMinutes ?? 0)),
      0,
    );
    const taskRate =
      todayTasks.length > 0
        ? Math.round((completedToday.length / todayTasks.length) * 100)
        : 0;
    const habitRate =
      habits.length > 0
        ? Math.round((loggedHabitIds.size / habits.length) * 100)
        : 0;
    const successScore = Math.round((taskRate + habitRate) / 2);

    return {
      range: {
        start: rangeStart.toISOString(),
        end: rangeEnd.toISOString(),
      },
      today: todayStr,
      googleCalendar: {
        connected: gcStatus.connected,
        configured:
          calendar.configured || gcStatus.configured || gcStatus.syncReady,
        email: gcStatus.email ?? null,
        upcomingCount: calendarEvents.length,
      },
      summary: {
        tasksOpen: openTasks.length,
        tasksDueToday: dueToday.length,
        habitsDueToday: habits.length,
        habitsLoggedToday: loggedHabitIds.size,
        goalsWithDeadline: goals.filter((g) => g.targetDate).length,
        reviewDoneToday: reviewToday.length > 0,
      },
      todaySuccess: {
        tasksCompleted: completedToday.length,
        tasksPlanned: plannedToday.length + completedToday.length,
        minutesPlanned,
        minutesAchieved,
        completionRate: taskRate,
        habitsDone: loggedHabitIds.size,
        habitsTotal: habits.length,
        successScore,
      },
      items,
    };
  }
}
