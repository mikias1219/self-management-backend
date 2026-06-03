import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { LearningProject } from '../../domain/entities/learning-project.entity';

@Injectable()
export class LearningProjectsService extends BaseCrudService<LearningProject> {
  constructor(
    @InjectRepository(LearningProject) repository: Repository<LearningProject>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.LEARNING,
      entityType: 'LearningProject',
    });
  }
}
