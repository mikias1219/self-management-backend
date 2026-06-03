import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { SpiritualActivity } from '../../domain/entities/spiritual-activity.entity';

@Injectable()
export class SpiritualService extends BaseCrudService<SpiritualActivity> {
  constructor(
    @InjectRepository(SpiritualActivity)
    repository: Repository<SpiritualActivity>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.SPIRITUAL,
      entityType: 'SpiritualActivity',
    });
  }
}
