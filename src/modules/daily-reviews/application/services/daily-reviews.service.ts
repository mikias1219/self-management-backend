import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { DailyReview } from '../../domain/entities/daily-review.entity';

@Injectable()
export class DailyReviewsService extends BaseCrudService<DailyReview> {
  constructor(
    @InjectRepository(DailyReview)
    repository: Repository<DailyReview>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.DAILY_REVIEWS,
      entityType: 'DailyReview',
    });
  }
}
