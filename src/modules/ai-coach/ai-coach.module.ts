import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from '../activity-logs/domain/entities/activity-log.entity';
import { AchievementsModule } from '../achievements/achievements.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { DailyReview } from '../daily-reviews/domain/entities/daily-review.entity';
import { EnglishPractice } from '../english/domain/entities/english-practice.entity';
import { FinanceAccount } from '../finance/domain/entities/account.entity';
import { FinanceBudget } from '../finance/domain/entities/budget.entity';
import { FinanceCycle } from '../finance/domain/entities/finance-cycle.entity';
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
import { NotificationsModule } from '../notifications/notifications.module';
import { Notification } from '../notifications/domain/entities/notification.entity';
import { SpiritualActivity } from '../spiritual/domain/entities/spiritual-activity.entity';
import { ProductivityModule } from '../productivity/productivity.module';
import { TasksModule } from '../tasks/tasks.module';
import { HabitsModule } from '../habits/habits.module';
import { GoalsModule } from '../goals/goals.module';
import { JournalModule } from '../journal/journal.module';
import { FinanceModule } from '../finance/finance.module';
import { Task } from '../tasks/domain/entities/task.entity';
import { AiActionsService } from './application/services/ai-actions.service';
import { AiChatContextService } from './application/services/ai-chat-context.service';
import { AiChatService } from './application/services/ai-chat.service';
import { AiCoachService } from './application/services/ai-coach.service';
import { AiCoachSession } from './domain/entities/ai-coach-session.entity';
import { AiCoachController } from './presentation/controllers/ai-coach.controller';

@Module({
  imports: [
    AchievementsModule,
    AnalyticsModule,
    ProductivityModule,
    TasksModule,
    HabitsModule,
    GoalsModule,
    JournalModule,
    FinanceModule,
    NotificationsModule,
    TypeOrmModule.forFeature([
      AiCoachSession,
      Task,
      FinanceTransaction,
      FinanceAccount,
      FinanceBudget,
      FinanceCycle,
      Goal,
      Habit,
      HabitLog,
      HealthLog,
      DailyReview,
      JournalEntry,
      EnglishPractice,
      SpiritualActivity,
      StudySession,
      Book,
      Course,
      LearningProject,
      Notification,
      ActivityLog,
    ]),
  ],
  controllers: [AiCoachController],
  providers: [
    AiCoachService,
    AiChatContextService,
    AiChatService,
    AiActionsService,
  ],
  exports: [AiCoachService, AiChatService],
})
export class AiCoachModule {}
