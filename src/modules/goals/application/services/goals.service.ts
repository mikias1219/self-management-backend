import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';
import {
  ActivityAction,
  ActivityModule,
} from '../../../../common/domain/enums/activity-action.enum';
import { EntityStatus } from '../../../../common/domain/enums/entity-status.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { GoogleCalendarService } from '../../../integrations/application/services/google-calendar.service';
import { Goal } from '../../domain/entities/goal.entity';
import { CreateGoalDto } from '../dto/create-goal.dto';

@Injectable()
export class GoalsService extends BaseCrudService<Goal> {
  protected override readonly relations = { children: true, parent: true };

  constructor(
    @InjectRepository(Goal)
    repository: Repository<Goal>,
    activityLogs: ActivityLogsService,
    private readonly googleCalendar: GoogleCalendarService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.GOALS,
      entityType: 'Goal',
    });
  }

  override async findAllForUser(
    userId: string,
    options?: FindManyOptions<Goal> & { includeCompleted?: boolean },
  ): Promise<Goal[]> {
    const { includeCompleted, where, ...rest } = options ?? {};
    const baseWhere = (where ?? {}) as FindOptionsWhere<Goal>;
    const scopedWhere = includeCompleted
      ? baseWhere
      : { ...baseWhere, status: EntityStatus.ACTIVE };

    return super.findAllForUser(userId, {
      ...rest,
      where: scopedWhere,
    });
  }

  async create(dto: CreateGoalDto, userId: string): Promise<Goal> {
    if (dto.parentId) {
      const parent = await this.findOneForUser(userId, dto.parentId);
      if (parent.parentId) {
        throw new BadRequestException('Parent goal cannot be a sub-goal');
      }
    }
    let saved = await super.create(dto as DeepPartial<Goal>, userId);
    saved = await this.googleCalendar.syncGoal(userId, saved);
    if (saved.googleCalendarEventId) {
      saved = await this.repository.save(saved);
    }
    return saved;
  }

  override async update(
    id: string,
    dto: DeepPartial<Goal>,
    userId: string,
  ): Promise<Goal> {
    const existing = await this.findOneForUser(userId, id);
    const patch = { ...dto };

    if (
      patch.progress != null &&
      patch.progress >= 100 &&
      (existing.progress ?? 0) < 100
    ) {
      patch.progress = 100;
      patch.status = EntityStatus.COMPLETED;
    }

    let saved = await super.update(id, patch, userId);

    if (
      (saved.progress ?? 0) >= 100 &&
      (existing.progress ?? 0) < 100
    ) {
      await this.activityLogs.log({
        userId,
        module: ActivityModule.GOALS,
        action: ActivityAction.COMPLETED,
        entityType: 'Goal',
        entityId: saved.id,
        description: `Achieved goal: ${saved.title}`,
        metadata: { title: saved.title, progress: saved.progress },
      });
    }

    saved = await this.googleCalendar.syncGoal(userId, saved);
    if (saved.googleCalendarEventId !== existing.googleCalendarEventId) {
      saved = await this.repository.save(saved);
    }

    if (saved.parentId) {
      await this.syncParentProgress(saved.parentId, userId);
    }

    return saved;
  }

  private async syncParentProgress(
    parentId: string,
    userId: string,
  ): Promise<void> {
    const children = await this.repository.find({
      where: { createdBy: userId, parentId },
    });
    if (children.length === 0) return;

    const avgProgress = Math.round(
      children.reduce((sum, child) => sum + (child.progress ?? 0), 0) /
        children.length,
    );
    const patch: DeepPartial<Goal> = { progress: avgProgress };
    if (avgProgress >= 100) {
      patch.progress = 100;
      patch.status = EntityStatus.COMPLETED;
    }

    await super.update(parentId, patch, userId);
  }

  override async remove(id: string, userId: string): Promise<void> {
    const existing = await this.findOneForUser(userId, id);
    await this.googleCalendar.removeGoalEvent(userId, existing);
    await super.remove(id, userId);
  }
}
