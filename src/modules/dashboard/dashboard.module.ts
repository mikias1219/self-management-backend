import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsModule } from '../analytics/analytics.module';
import { Goal } from '../goals/domain/entities/goal.entity';
import { Habit } from '../habits/domain/entities/habit.entity';
import { Notification } from '../notifications/domain/entities/notification.entity';
import { Task } from '../tasks/domain/entities/task.entity';
import { DashboardService } from './application/services/dashboard.service';
import { DashboardController } from './presentation/controllers/dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Goal, Habit, Notification]),
    AnalyticsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
