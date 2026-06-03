import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { EnglishPractice } from '../../domain/entities/english-practice.entity';

@Injectable()
export class EnglishService extends BaseCrudService<EnglishPractice> {
  constructor(
    @InjectRepository(EnglishPractice)
    repository: Repository<EnglishPractice>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.ENGLISH,
      entityType: 'EnglishPractice',
    });
  }
}
