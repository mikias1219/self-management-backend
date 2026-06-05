import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { RecurringObligation } from '../../domain/entities/recurring-obligation.entity';

@Injectable()
export class RecurringObligationsService extends BaseCrudService<RecurringObligation> {
  constructor(
    @InjectRepository(RecurringObligation)
    repository: Repository<RecurringObligation>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.FINANCE,
      entityType: 'RecurringObligation',
    });
  }
}
