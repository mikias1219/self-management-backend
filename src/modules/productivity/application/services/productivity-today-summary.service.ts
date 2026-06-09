import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays, endOfDay, format, startOfDay } from 'date-fns';
import { Between, In, Repository } from 'typeorm';
import { habitLogsInRange } from '../../../../common/utils/habit-logs.util';
import { DailyReview } from '../../../daily-reviews/domain/entities/daily-review.entity';
import { FinanceCyclesService } from '../../../finance/application/services/finance-cycles.service';
import { Goal } from '../../../goals/domain/entities/goal.entity';
import { Habit } from '../../../habits/domain/entities/habit.entity';
import { Task } from '../../../tasks/domain/entities/task.entity';
import { TaskStatus } from '../../../tasks/domain/enums/task.enums';

const CACHE_TTL_MS = 60_000;

@Injectable()
export class ProductivityTodaySummaryService {
  constructor(
    @InjectRepository(Task) private readonly tasksRepo: Repository<Task>,
    @InjectRepository(Goal) private readonly goalsRepo: Repository<Goal>,
    @InjectRepository(Habit) private readonly habitsRepo: Repository<Habit>,
    @InjectRepository(DailyReview) private readonly reviewsRepo: Repository<DailyReview>,
    private readonly financeCycles: FinanceCyclesService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getTodaySummary(userId: string) {
    const cacheKey = `productivity:today-summary:${userId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const today = format(new Date(), 'yyyy-MM-dd');
    const todayStart = startOfDay(new Date());
    const threeDaysOut = format(addDays(new Date(), 3), 'yyyy-MM-dd');

    const openStatuses = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED];

    const todayEnd = endOfDay(new Date());

    const [tasks, habits, goals, review, currentCycle] = await Promise.all([
      this.tasksRepo.find({
        where: {
          createdBy: userId,
          taskStatus: In(openStatuses),
          dueDate: Between(todayStart, todayEnd),
        },
        order: { dueDate: 'ASC' },
        take: 20,
      }),
      this.habitsRepo.find({
        where: { createdBy: userId },
        relations: { logs: true },
        order: { name: 'ASC' },
      }),
      this.goalsRepo.find({
        where: { createdBy: userId },
        order: { updatedAt: 'DESC' },
        take: 10,
      }),
      this.reviewsRepo.findOne({
        where: { createdBy: userId, reviewDate: today },
      }),
      this.financeCycles.getCurrent(userId),
    ]);

    const habitLogsToday = habitLogsInRange(habits, todayStart, addDays(todayStart, 1));
    const loggedHabitIds = new Set(habitLogsToday.map((l) => l.habitId));

    const habitsDueToday = habits
      .filter((h) => this.isHabitDueToday(h, today))
      .map((h) => ({
        id: h.id,
        name: h.name,
        currentStreak: h.currentStreak,
        logged: loggedHabitIds.has(h.id),
      }));

    let obligations: Array<{
      id: string;
      name: string;
      dueDate: string;
      expectedAmount: number;
      paid: boolean;
      status: string;
    }> = [];

    if (currentCycle) {
      const summary = await this.financeCycles.getObligationSummary(
        userId,
        currentCycle.id,
      );
      obligations = [...summary.overdue, ...summary.upcoming]
        .filter((o) => o.dueDate <= threeDaysOut)
        .map((o) => ({
          id: o.id,
          name: o.name,
          dueDate: o.dueDate,
          expectedAmount: Number(o.expectedAmount),
          paid: false,
          status: o.obligationStatus,
        }));
    }

    const activeGoals = goals
      .filter((g) => (g.progress ?? 0) < 100)
      .map((g) => ({
        id: g.id,
        title: g.title,
        progress: g.progress ?? 0,
        level: g.level,
      }));

    const result = {
      date: today,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        taskStatus: t.taskStatus,
        priority: t.priority,
        dueDate: t.dueDate,
        goalId: t.goalId,
      })),
      habits: habitsDueToday,
      obligations,
      goals: activeGoals,
      reviewExists: !!review,
    };

    await this.cache.set(cacheKey, result, CACHE_TTL_MS);
    return result;
  }

  private isHabitDueToday(habit: Habit, _today: string): boolean {
    return true;
  }
}
