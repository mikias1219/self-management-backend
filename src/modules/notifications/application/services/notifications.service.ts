import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { Notification } from '../../domain/entities/notification.entity';

@Injectable()
export class NotificationsService extends BaseCrudService<Notification> {
  constructor(
    @InjectRepository(Notification)
    repository: Repository<Notification>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.NOTIFICATIONS,
      entityType: 'Notification',
    });
  }

  countUnread(userId: string): Promise<number> {
    return this.repository.count({
      where: { createdBy: userId, isRead: false },
    });
  }

  async notifyUser(
    userId: string,
    input: { title: string; message: string; link?: string },
  ): Promise<Notification> {
    return this.create(
      {
        title: input.title,
        message: input.message,
        link: input.link,
        isRead: false,
      },
      userId,
    );
  }
}
