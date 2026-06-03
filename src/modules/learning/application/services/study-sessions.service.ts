import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { StudySession } from '../../domain/entities/study-session.entity';

@Injectable()
export class StudySessionsService extends BaseCrudService<StudySession> {
  constructor(
    @InjectRepository(StudySession) repository: Repository<StudySession>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.LEARNING,
      entityType: 'StudySession',
    });
  }
}
