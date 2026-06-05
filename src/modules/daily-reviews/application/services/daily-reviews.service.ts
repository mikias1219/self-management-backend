import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format } from 'date-fns';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { DailyReview } from '../../domain/entities/daily-review.entity';
import { UpdateDailyReviewDto } from '../dto/update-daily-review.dto';

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

  async findToday(userId: string): Promise<DailyReview | null> {
    const today = format(new Date(), 'yyyy-MM-dd');
    return this.repository.findOne({
      where: { createdBy: userId, reviewDate: today },
    });
  }

  async upsertToday(
    userId: string,
    dto: UpdateDailyReviewDto,
  ): Promise<DailyReview> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const existing = await this.findToday(userId);
    if (existing) {
      return this.update(existing.id, { ...dto, reviewDate: today }, userId);
    }
    return this.create({ ...dto, reviewDate: today }, userId);
  }
}
