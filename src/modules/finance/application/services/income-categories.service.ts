import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { IncomeCategory } from '../../domain/entities/income-category.entity';

@Injectable()
export class IncomeCategoriesService extends BaseCrudService<IncomeCategory> {
  constructor(
    @InjectRepository(IncomeCategory) repository: Repository<IncomeCategory>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.FINANCE,
      entityType: 'IncomeCategory',
    });
  }
}
