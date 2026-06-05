import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyReview } from '../daily-reviews/domain/entities/daily-review.entity';
import { EnglishPractice } from '../english/domain/entities/english-practice.entity';
import { FinanceAccount } from '../finance/domain/entities/account.entity';
import { ExpenseCategory } from '../finance/domain/entities/expense-category.entity';
import { IncomeCategory } from '../finance/domain/entities/income-category.entity';
import { FinanceTransaction } from '../finance/domain/entities/transaction.entity';
import { Goal } from '../goals/domain/entities/goal.entity';
import { Habit } from '../habits/domain/entities/habit.entity';
import { HabitLog } from '../habits/domain/entities/habit-log.entity';
import { HealthLog } from '../health/domain/entities/health-log.entity';
import { Book } from '../learning/domain/entities/book.entity';
import { Course } from '../learning/domain/entities/course.entity';
import { StudySession } from '../learning/domain/entities/study-session.entity';
import { JournalEntry } from '../journal/domain/entities/journal-entry.entity';
import { SpiritualActivity } from '../spiritual/domain/entities/spiritual-activity.entity';
import { Task } from '../tasks/domain/entities/task.entity';
import { AnalyticsService } from './application/services/analytics.service';
import { LifeIntelligenceService } from './application/services/life-intelligence.service';
import { AnalyticsController } from './presentation/controllers/analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      Goal,
      Habit,
      HabitLog,
      DailyReview,
      StudySession,
      Course,
      Book,
      FinanceAccount,
      FinanceTransaction,
      ExpenseCategory,
      IncomeCategory,
      EnglishPractice,
      SpiritualActivity,
      HealthLog,
      JournalEntry,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, LifeIntelligenceService],
  exports: [AnalyticsService, LifeIntelligenceService],
})
export class AnalyticsModule {}
