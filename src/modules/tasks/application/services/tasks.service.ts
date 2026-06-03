import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { Task } from '../../domain/entities/task.entity';

@Injectable()
export class TasksService extends BaseCrudService<Task> {
  constructor(
    @InjectRepository(Task)
    repository: Repository<Task>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.TASKS,
      entityType: 'Task',
    });
  }
}
