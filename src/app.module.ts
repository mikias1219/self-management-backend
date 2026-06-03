import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { SeedModule } from './database/seeds/seed.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { RealtimeModule } from './infrastructure/realtime/realtime.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { AiCoachModule } from './modules/ai-coach/ai-coach.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { DailyReviewsModule } from './modules/daily-reviews/daily-reviews.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EnglishModule } from './modules/english/english.module';
import { FinanceModule } from './modules/finance/finance.module';
import { GoalsModule } from './modules/goals/goals.module';
import { HabitsModule } from './modules/habits/habits.module';
import { HealthModule } from './modules/health/health.module';
import { JournalModule } from './modules/journal/journal.module';
import { LearningModule } from './modules/learning/learning.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SpiritualModule } from './modules/spiritual/spiritual.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule,
    RedisModule,
    RealtimeModule,
    ActivityLogsModule,
    AuthModule,
    TasksModule,
    GoalsModule,
    HabitsModule,
    DailyReviewsModule,
    LearningModule,
    FinanceModule,
    EnglishModule,
    SpiritualModule,
    HealthModule,
    JournalModule,
    NotificationsModule,
    SettingsModule,
    AiCoachModule,
    AnalyticsModule,
    DashboardModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
