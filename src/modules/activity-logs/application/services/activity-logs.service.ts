import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { ActivityLog } from '../../domain/entities/activity-log.entity';
import {
  ActivityAction,
  ActivityModule,
} from '../../../../common/domain/enums/activity-action.enum';
import { DateRangeQueryDto } from '../../../../common/dto/date-range.dto';
import { resolveDateRange } from '../../../../common/utils/date-range.util';
import { RealtimeService } from '../../../../infrastructure/realtime/realtime.service';

export interface LogActivityInput {
  userId: string;
  module: ActivityModule;
  action: ActivityAction;
  entityType: string;
  entityId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly repository: Repository<ActivityLog>,
    private readonly realtime: RealtimeService,
  ) {}

  async log(input: LogActivityInput): Promise<ActivityLog> {
    const entry = this.repository.create({
      userId: input.userId,
      module: input.module,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      description: input.description,
      metadata: input.metadata,
      createdBy: input.userId,
    });
    const saved = await this.repository.save(entry);
    this.realtime.publish(input.userId, {
      module: input.module,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      at: saved.createdAt.toISOString(),
    });
    return saved;
  }

  async findByUser(userId: string, query?: DateRangeQueryDto): Promise<ActivityLog[]> {
    const range = resolveDateRange(query?.period, query?.startDate, query?.endDate);
    return this.repository.find({
      where: {
        userId,
        createdAt: Between(range.start, range.end),
      },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async findAll(userId: string): Promise<ActivityLog[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }
}
