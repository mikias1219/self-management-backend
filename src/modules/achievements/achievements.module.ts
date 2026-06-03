import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from '../activity-logs/domain/entities/activity-log.entity';
import { DailyReview } from '../daily-reviews/domain/entities/daily-review.entity';
import { EnglishPractice } from '../english/domain/entities/english-practice.entity';
import { FinanceBudget } from '../finance/domain/entities/budget.entity';
import { SavingsGoal } from '../finance/domain/entities/savings-goal.entity';
import { FinanceTransaction } from '../finance/domain/entities/transaction.entity';
import { Goal } from '../goals/domain/entities/goal.entity';
import { HabitLog } from '../habits/domain/entities/habit-log.entity';
import { Habit } from '../habits/domain/entities/habit.entity';
import { HealthLog } from '../health/domain/entities/health-log.entity';
import { Book } from '../learning/domain/entities/book.entity';
import { Course } from '../learning/domain/entities/course.entity';
import { LearningProject } from '../learning/domain/entities/learning-project.entity';
import { StudySession } from '../learning/domain/entities/study-session.entity';
import { JournalEntry } from '../journal/domain/entities/journal-entry.entity';
import { Notification } from '../notifications/domain/entities/notification.entity';
import { SpiritualActivity } from '../spiritual/domain/entities/spiritual-activity.entity';
import { Task } from '../tasks/domain/entities/task.entity';
import { AchievementsService } from './application/services/achievements.service';
import { AchievementsController } from './presentation/controllers/achievements.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      Goal,
      Habit,
      HabitLog,
      Book,
      Course,
      LearningProject,
      StudySession,
      DailyReview,
      FinanceTransaction,
      FinanceBudget,
      SavingsGoal,
      EnglishPractice,
      SpiritualActivity,
      HealthLog,
      JournalEntry,
      Notification,
      ActivityLog,
    ]),
  ],
  controllers: [AchievementsController],
  providers: [AchievementsService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
