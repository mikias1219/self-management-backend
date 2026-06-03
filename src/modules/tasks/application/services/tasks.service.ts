import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import {
  ActivityAction,
  ActivityModule,
} from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { Task } from '../../domain/entities/task.entity';
import { TaskStatus } from '../../domain/enums/task.enums';
import { ReportTaskDto } from '../dto/report-task.dto';

@Injectable()
export class TasksService extends BaseCrudService<Task> {
  constructor(
    @InjectRepository(Task)
    repository: Repository<Task>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.TASKS,
      entityType: 'Task',
    });
  }

  override async update(
    id: string,
    dto: DeepPartial<Task>,
    userId: string,
  ): Promise<Task> {
    const existing = await this.findOneForUser(userId, id);
    const patch = { ...dto };

    if (
      patch.taskStatus === TaskStatus.DONE &&
      existing.taskStatus !== TaskStatus.DONE
    ) {
      patch.completedAt = patch.completedAt ?? new Date();
      if (
        patch.timeSpentMinutes == null &&
        (existing.timeSpentMinutes ?? 0) === 0 &&
        existing.estimatedMinutes
      ) {
        patch.timeSpentMinutes = existing.estimatedMinutes;
      }
    }

    const saved = await super.update(id, patch, userId);

    if (
      patch.taskStatus === TaskStatus.DONE &&
      existing.taskStatus !== TaskStatus.DONE
    ) {
      await this.logTaskCompletion(userId, saved);
    }

    return saved;
  }

  async reportTask(
    userId: string,
    id: string,
    dto: ReportTaskDto,
  ): Promise<Task> {
    const task = await this.findOneForUser(userId, id);
    task.timeSpentMinutes = dto.timeSpentMinutes;
    task.taskStatus = TaskStatus.DONE;
    task.completedAt = new Date();
    const saved = await this.repository.save(task);
    await this.logTaskCompletion(userId, saved, dto.notes);
    return saved;
  }

  private async logTaskCompletion(
    userId: string,
    task: Task,
    notes?: string,
  ): Promise<void> {
    const planned = task.estimatedMinutes ?? 0;
    const achieved = task.timeSpentMinutes ?? 0;
    const pct =
      planned > 0 ? Math.round((achieved / planned) * 100) : achieved > 0 ? 100 : 0;

    await this.activityLogs.log({
      userId,
      module: ActivityModule.TASKS,
      action: ActivityAction.COMPLETED,
      entityType: 'Task',
      entityId: task.id,
      description:
        planned > 0
          ? `Reported task: ${task.title} — ${achieved}/${planned} min (${pct}%)`
          : `Completed task: ${task.title}${achieved > 0 ? ` — ${achieved} min` : ''}`,
      metadata: {
        title: task.title,
        plannedMinutes: planned,
        achievedMinutes: achieved,
        fulfillmentPercent: pct,
        notes,
        completedAt: task.completedAt,
      },
    });
  }
}
