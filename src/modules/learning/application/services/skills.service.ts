import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { Skill } from '../../domain/entities/skill.entity';

@Injectable()
export class SkillsService extends BaseCrudService<Skill> {
  constructor(
    @InjectRepository(Skill) repository: Repository<Skill>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.LEARNING,
      entityType: 'Skill',
    });
  }
}
