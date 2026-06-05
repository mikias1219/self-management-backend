import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskStatus } from '../../../tasks/domain/enums/task.enums';
import { Task } from '../../../tasks/domain/entities/task.entity';
import { LifeIntelligenceService } from '../../../analytics/application/services/life-intelligence.service';

const OVERVIEW_CACHE_TTL_MS = 60_000;

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Task) private readonly tasksRepo: Repository<Task>,
    private readonly intelligence: LifeIntelligenceService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getOverview(userId: string) {
    const cacheKey = `dashboard:overview:${userId}`;
    const cached = await this.cache.get<Awaited<ReturnType<typeof this.buildOverview>>>(
      cacheKey,
    );
    if (cached) return cached;

    const result = await this.buildOverview(userId);
    await this.cache.set(cacheKey, result, OVERVIEW_CACHE_TTL_MS);
    return result;
  }

  private async buildOverview(userId: string) {
    const snapshot = await this.intelligence.getUnifiedIntelligence(userId);

    const recentTasks = await this.tasksRepo.find({
      where: { createdBy: userId },
      order: { updatedAt: 'DESC' },
      take: 5,
    });

    const pendingTasks = await this.tasksRepo.count({
      where: {
        createdBy: userId,
        taskStatus: TaskStatus.TODO,
      },
    });

    const inProgressTasks = await this.tasksRepo.count({
      where: {
        createdBy: userId,
        taskStatus: TaskStatus.IN_PROGRESS,
      },
    });

    return {
      todayFocus: {
        tasks: snapshot.tasks.focusToday,
        spendingToday: snapshot.finance.weekly.expense,
        habitsCompletionRate: snapshot.habits.completionRateToday,
        studyMinutes: snapshot.learning.studyMinutesToday,
      },
      financialSnapshot: {
        currency: snapshot.finance.currency,
        monthlyIncome: snapshot.finance.monthly.income,
        monthlyExpense: snapshot.finance.monthly.expense,
        netBalance: snapshot.finance.monthly.netBalance,
        savingsRate: snapshot.finance.monthly.savingsRate,
        burnRate: snapshot.finance.burnRate,
        forecastEndOfMonthNet: snapshot.finance.forecast.endOfMonthNet,
      },
      taskStatus: {
        pending: pendingTasks,
        inProgress: inProgressTasks,
        overdue: snapshot.tasks.overdue.length,
        completedThisWeek: snapshot.tasks.metrics.completedThisWeek,
        completionRate: snapshot.tasks.metrics.completionRate,
        productivityScore: snapshot.scores.productivityScore,
      },
      aiInsight: snapshot.aiInsight,
      dailySummary: snapshot.dailySummary,
      scores: snapshot.scores,
      recentTasks,
      intelligence: {
        weeklyPerformance: snapshot.weeklyPerformance,
        monthlyTrend: snapshot.monthlyTrend,
      },
    };
  }
}
