import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyReview } from '../daily-reviews/domain/entities/daily-review.entity';
import { FinanceModule } from '../finance/finance.module';
import { Goal } from '../goals/domain/entities/goal.entity';
import { Habit } from '../habits/domain/entities/habit.entity';
import { IntegrationsModule } from '../integrations/integrations.module';
import { Task } from '../tasks/domain/entities/task.entity';
import { ProductivityMetricsService } from './application/services/productivity-metrics.service';
import { ProductivityScheduleService } from './application/services/productivity-schedule.service';
import { ProductivityTodaySummaryService } from './application/services/productivity-today-summary.service';
import { ProductivityController } from './presentation/controllers/productivity.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Goal, Habit, DailyReview]),
    IntegrationsModule,
    FinanceModule,
  ],
  controllers: [ProductivityController],
  providers: [
    ProductivityMetricsService,
    ProductivityScheduleService,
    ProductivityTodaySummaryService,
  ],
  exports: [
    ProductivityMetricsService,
    ProductivityScheduleService,
    ProductivityTodaySummaryService,
  ],
})
export class ProductivityModule {}
