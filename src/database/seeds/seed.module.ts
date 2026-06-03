import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiCoachSession } from '../../modules/ai-coach/domain/entities/ai-coach-session.entity';
import { DailyReview } from '../../modules/daily-reviews/domain/entities/daily-review.entity';
import { EnglishPractice } from '../../modules/english/domain/entities/english-practice.entity';
import { FinanceAccount } from '../../modules/finance/domain/entities/account.entity';
import { FinanceBudget } from '../../modules/finance/domain/entities/budget.entity';
import { ExpenseCategory } from '../../modules/finance/domain/entities/expense-category.entity';
import { IncomeCategory } from '../../modules/finance/domain/entities/income-category.entity';
import { SavingsGoal } from '../../modules/finance/domain/entities/savings-goal.entity';
import { FinanceTransaction } from '../../modules/finance/domain/entities/transaction.entity';
import { Goal } from '../../modules/goals/domain/entities/goal.entity';
import { HabitLog } from '../../modules/habits/domain/entities/habit-log.entity';
import { Habit } from '../../modules/habits/domain/entities/habit.entity';
import { HealthLog } from '../../modules/health/domain/entities/health-log.entity';
import { Book } from '../../modules/learning/domain/entities/book.entity';
import { Course } from '../../modules/learning/domain/entities/course.entity';
import { LearningProject } from '../../modules/learning/domain/entities/learning-project.entity';
import { Skill } from '../../modules/learning/domain/entities/skill.entity';
import { StudySession } from '../../modules/learning/domain/entities/study-session.entity';
import { JournalEntry } from '../../modules/journal/domain/entities/journal-entry.entity';
import { Notification } from '../../modules/notifications/domain/entities/notification.entity';
import { UserSettings } from '../../modules/settings/domain/entities/user-settings.entity';
import { SpiritualActivity } from '../../modules/spiritual/domain/entities/spiritual-activity.entity';
import { Task } from '../../modules/tasks/domain/entities/task.entity';
import { User } from '../../modules/users/domain/entities/user.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Task,
      Goal,
      Habit,
      HabitLog,
      DailyReview,
      Skill,
      Course,
      Book,
      LearningProject,
      StudySession,
      FinanceAccount,
      FinanceTransaction,
      FinanceBudget,
      SavingsGoal,
      ExpenseCategory,
      IncomeCategory,
      EnglishPractice,
      SpiritualActivity,
      HealthLog,
      JournalEntry,
      Notification,
      UserSettings,
      AiCoachSession,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
