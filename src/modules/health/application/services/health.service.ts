import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { HealthLog } from '../../domain/entities/health-log.entity';

@Injectable()
export class HealthService extends BaseCrudService<HealthLog> {
  constructor(
    @InjectRepository(HealthLog)
    repository: Repository<HealthLog>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.HEALTH,
      entityType: 'HealthLog',
    });
  }
}
