import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { Book } from '../../domain/entities/book.entity';

@Injectable()
export class BooksService extends BaseCrudService<Book> {
  constructor(
    @InjectRepository(Book) repository: Repository<Book>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.LEARNING,
      entityType: 'Book',
    });
  }
}
