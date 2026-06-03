import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { AiCoachSession } from '../../domain/entities/ai-coach-session.entity';

@Injectable()
export class AiCoachService extends BaseCrudService<AiCoachSession> {
  constructor(
    @InjectRepository(AiCoachSession)
    repository: Repository<AiCoachSession>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.AI_COACH,
      entityType: 'AiCoachSession',
    });
  }
}
