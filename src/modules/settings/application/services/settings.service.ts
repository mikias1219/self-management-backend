import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ActivityAction,
  ActivityModule,
} from '../../../../common/domain/enums/activity-action.enum';
import { EntityStatus } from '../../../../common/domain/enums/entity-status.enum';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { UserSettings } from '../../domain/entities/user-settings.entity';
import { UpdateUserSettingsDto } from '../dto/update-user-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(UserSettings)
    private readonly repository: Repository<UserSettings>,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async getForUser(userId: string): Promise<UserSettings> {
    let settings = await this.repository.findOne({
      where: { createdBy: userId },
    });
    if (!settings) {
      settings = this.repository.create({
        createdBy: userId,
        status: EntityStatus.ACTIVE,
      });
      settings = await this.repository.save(settings);
    }
    return settings;
  }

  async updateForUser(
    userId: string,
    dto: UpdateUserSettingsDto,
  ): Promise<UserSettings> {
    const settings = await this.getForUser(userId);
    Object.assign(settings, dto);
    const saved = await this.repository.save(settings);
    await this.activityLogs.log({
      userId,
      module: ActivityModule.SETTINGS,
      action: ActivityAction.UPDATED,
      entityType: 'UserSettings',
      entityId: saved.id,
      metadata: dto as Record<string, unknown>,
    });
    return saved;
  }

  async saveSettings(settings: UserSettings): Promise<UserSettings> {
    return this.repository.save(settings);
  }
}
