import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskStatus } from '../../../tasks/domain/enums/task.enums';
import { Task } from '../../../tasks/domain/entities/task.entity';
import { Goal } from '../../../goals/domain/entities/goal.entity';
import { Habit } from '../../../habits/domain/entities/habit.entity';
import { Notification } from '../../../notifications/domain/entities/notification.entity';
import { AnalyticsService } from '../../../analytics/application/services/analytics.service';
import { DateRangeQueryDto } from '../../../../common/dto/date-range.dto';
import { AnalyticsPeriod } from '../../../../common/domain/enums/period.enum';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Task) private readonly tasksRepo: Repository<Task>,
    @InjectRepository(Goal) private readonly goalsRepo: Repository<Goal>,
    @InjectRepository(Habit) private readonly habitsRepo: Repository<Habit>,
    @InjectRepository(Notification) private readonly notificationsRepo: Repository<Notification>,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async getOverview(userId: string) {
    const todayQuery: DateRangeQueryDto = { period: AnalyticsPeriod.DAY };
    const analytics = await this.analyticsService.getCountsByPeriod(userId, todayQuery);

    const [pendingTasks, activeGoals, activeHabits, unreadNotifications] =
      await Promise.all([
        this.tasksRepo.count({
          where: {
            createdBy: userId,
            taskStatus: TaskStatus.TODO,
          },
        }),
        this.goalsRepo.count({ where: { createdBy: userId } }),
        this.habitsRepo.count({ where: { createdBy: userId } }),
        this.notificationsRepo.count({
          where: { createdBy: userId, isRead: false },
        }),
      ]);

    const recentTasks = await this.tasksRepo.find({
      where: { createdBy: userId },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      summary: {
        pendingTasks,
        activeGoals,
        activeHabits,
        unreadNotifications,
      },
      todayActivity: analytics.counts,
      recentTasks,
    };
  }
}
