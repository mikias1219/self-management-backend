import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { SavingsGoal } from '../../domain/entities/savings-goal.entity';

@Injectable()
export class SavingsGoalsService extends BaseCrudService<SavingsGoal> {
  constructor(
    @InjectRepository(SavingsGoal) repository: Repository<SavingsGoal>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.FINANCE,
      entityType: 'SavingsGoal',
    });
  }
}
