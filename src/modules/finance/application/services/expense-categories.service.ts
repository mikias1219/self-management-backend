import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { ExpenseCategory } from '../../domain/entities/expense-category.entity';

@Injectable()
export class ExpenseCategoriesService extends BaseCrudService<ExpenseCategory> {
  constructor(
    @InjectRepository(ExpenseCategory) repository: Repository<ExpenseCategory>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.FINANCE,
      entityType: 'ExpenseCategory',
    });
  }
}
