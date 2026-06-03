import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { JournalEntry } from '../../domain/entities/journal-entry.entity';

@Injectable()
export class JournalService extends BaseCrudService<JournalEntry> {
  constructor(
    @InjectRepository(JournalEntry)
    repository: Repository<JournalEntry>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.JOURNAL,
      entityType: 'JournalEntry',
    });
  }
}
