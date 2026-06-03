import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from './domain/entities/activity-log.entity';
import { ActivityLogsService } from './application/services/activity-logs.service';
import { ActivityLogsController } from './presentation/controllers/activity-logs.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog])],
  controllers: [ActivityLogsController],
  providers: [ActivityLogsService],
  exports: [ActivityLogsService],
})
export class ActivityLogsModule {}
