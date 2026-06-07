import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { FinanceTransaction } from '../finance/domain/entities/transaction.entity';
import { Task } from '../tasks/domain/entities/task.entity';
import { TimelineService } from './application/services/timeline.service';
import { TimelineController } from './presentation/controllers/timeline.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, FinanceTransaction]),
    ActivityLogsModule,
  ],
  controllers: [TimelineController],
  providers: [TimelineService],
  exports: [TimelineService],
})
export class TimelineModule {}
