import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { invalidateDashboardOverview } from '../../../../common/utils/dashboard-cache.util';
import {
  addMonths,
  addWeeks,
  addYears,
  endOfDay,
  format,
  startOfDay,
} from 'date-fns';
import {
  Between,
  DeepPartial,
  FindOptionsWhere,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import {
  ActivityAction,
  ActivityModule,
} from '../../../../common/domain/enums/activity-action.enum';
import { RecurringInterval } from '../../../../common/domain/enums/recurring-interval.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { LifeArea } from '../../../../common/domain/enums/life-area.enum';
import { Goal } from '../../../goals/domain/entities/goal.entity';
import { GoogleCalendarService } from '../../../integrations/application/services/google-calendar.service';
import { Task } from '../../domain/entities/task.entity';
import { TaskStatus } from '../../domain/enums/task.enums';
import { ReportTaskDto } from '../dto/report-task.dto';
import { TaskQueryDto } from '../dto/task-query.dto';

@Injectable()
export class TasksService extends BaseCrudService<Task> {
  constructor(
    @InjectRepository(Task)
    repository: Repository<Task>,
    @InjectRepository(Goal)
    private readonly goalsRepo: Repository<Goal>,
    activityLogs: ActivityLogsService,
    private readonly googleCalendar: GoogleCalendarService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.TASKS,
      entityType: 'Task',
    });
  }

  async findAllFiltered(
    userId: string,
    query: TaskQueryDto,
  ): Promise<Task[]> {
    await this.ensureRecurringInstances(userId);

    const where: FindOptionsWhere<Task> = { createdBy: userId };

    if (query.taskStatus) where.taskStatus = query.taskStatus;
    if (query.lifeArea) where.lifeArea = query.lifeArea;
    if (query.parentTaskId) where.parentTaskId = query.parentTaskId;
    if (query.topLevelOnly) where.parentTaskId = IsNull();
    if (query.recurringOnly) {
      where.isRecurring = true;
      where.recurringParentId = IsNull();
    }
    if (query.completedFrom && query.completedTo) {
      where.completedAt = Between(
        startOfDay(new Date(query.completedFrom)),
        endOfDay(new Date(query.completedTo)),
      );
    } else if (query.completedFrom) {
      where.completedAt = MoreThanOrEqual(
        startOfDay(new Date(query.completedFrom)),
      );
    } else if (query.completedTo) {
      where.completedAt = LessThanOrEqual(
        endOfDay(new Date(query.completedTo)),
      );
    }
    if (query.dueFrom && query.dueTo) {
      where.dueDate = Between(
        startOfDay(new Date(query.dueFrom)),
        endOfDay(new Date(query.dueTo)),
      );
    } else if (query.dueFrom) {
      where.dueDate = MoreThanOrEqual(startOfDay(new Date(query.dueFrom)));
    } else if (query.dueTo) {
      where.dueDate = LessThanOrEqual(endOfDay(new Date(query.dueTo)));
    }
    if (query.scheduledFrom && query.scheduledTo) {
      where.scheduledAt = Between(
        startOfDay(new Date(query.scheduledFrom)),
        endOfDay(new Date(query.scheduledTo)),
      );
    } else if (query.scheduledFrom) {
      where.scheduledAt = MoreThanOrEqual(
        startOfDay(new Date(query.scheduledFrom)),
      );
    } else if (query.scheduledTo) {
      where.scheduledAt = LessThanOrEqual(
        endOfDay(new Date(query.scheduledTo)),
      );
    }

    return this.repository.find({
      where,
      relations: {
        goal: true,
        habit: true,
        parentTask: true,
        recurringParent: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /** Generate recurring task instances on demand (no cron). */
  async ensureRecurringInstances(userId: string): Promise<void> {
    const templates = await this.repository.find({
      where: {
        createdBy: userId,
        isRecurring: true,
        recurringParentId: IsNull(),
        taskStatus: TaskStatus.TODO,
      },
    });

    const now = new Date();
    for (const template of templates) {
      if (
        !template.recurringInterval ||
        template.recurringInterval === RecurringInterval.NONE
      ) {
        continue;
      }

      const anchor =
        template.lastRecurringGeneratedAt ??
        template.scheduledAt ??
        template.dueDate ??
        template.createdAt;
      if (!anchor) continue;

      const nextDue = this.nextRecurringDate(
        new Date(anchor),
        template.recurringInterval,
      );
      if (nextDue > now) continue;

      const exists = await this.repository.findOne({
        where: {
          createdBy: userId,
          recurringParentId: template.id,
          dueDate: Between(startOfDay(nextDue), endOfDay(nextDue)),
        },
      });
      if (exists) {
        template.lastRecurringGeneratedAt = nextDue;
        await this.repository.save(template);
        continue;
      }

      const instance = this.repository.create({
        createdBy: userId,
        title: template.title,
        description: template.description,
        priority: template.priority,
        taskStatus: TaskStatus.TODO,
        lifeArea: template.lifeArea,
        category: template.category,
        estimatedMinutes: template.estimatedMinutes,
        goalId: template.goalId,
        syncToCalendar: template.syncToCalendar,
        recurringParentId: template.id,
        dueDate: endOfDay(nextDue),
        scheduledAt: nextDue,
      });
      await this.repository.save(instance);
      template.lastRecurringGeneratedAt = nextDue;
      await this.repository.save(template);
    }
  }

  private nextRecurringDate(from: Date, interval: RecurringInterval): Date {
    switch (interval) {
      case RecurringInterval.WEEKLY:
        return addWeeks(from, 1);
      case RecurringInterval.MONTHLY:
        return addMonths(from, 1);
      case RecurringInterval.YEARLY:
        return addYears(from, 1);
      default:
        return from;
    }
  }

  async startTimer(userId: string, id: string): Promise<Task> {
    const task = await this.findOneForUser(userId, id);
    task.timerStartedAt = new Date();
    if (task.taskStatus === TaskStatus.TODO) {
      task.taskStatus = TaskStatus.IN_PROGRESS;
    }
    return this.repository.save(task);
  }

  override async create(
    dto: DeepPartial<Task>,
    userId: string,
  ): Promise<Task> {
    const patch = this.normalizeScheduleFields(dto);
    if (dto.syncToCalendar !== false && dto.syncToCalendar !== true) {
      patch.syncToCalendar = await this.googleCalendar.isConnected(userId);
    }
    let saved = await super.create(patch, userId);
    saved = await this.persistCalendarSync(userId, saved);
    if (saved.goalId) {
      await this.syncLinkedGoalProgress(userId, saved.goalId);
    }
    await invalidateDashboardOverview(this.cache, userId);
    return saved;
  }

  override async update(
    id: string,
    dto: DeepPartial<Task>,
    userId: string,
  ): Promise<Task> {
    const existing = await this.findOneForUser(userId, id);
    const patch = { ...dto };

    if (patch.syncToCalendar === false && existing.googleCalendarEventId) {
      await this.googleCalendar.removeTaskEvent(userId, existing);
      patch.googleCalendarEventId = undefined;
    }

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

    let saved = await super.update(id, patch, userId);

    if (
      patch.taskStatus === TaskStatus.DONE &&
      existing.taskStatus !== TaskStatus.DONE
    ) {
      await this.logTaskCompletion(userId, saved);
    }

    saved = await this.persistCalendarSync(userId, saved, existing.googleCalendarEventId);

    const goalIds = new Set(
      [existing.goalId, saved.goalId].filter(Boolean) as string[],
    );
    for (const goalId of goalIds) {
      await this.syncLinkedGoalProgress(userId, goalId);
    }

    await invalidateDashboardOverview(this.cache, userId);
    return saved;
  }

  override async remove(id: string, userId: string): Promise<void> {
    const existing = await this.findOneForUser(userId, id);
    const goalId = existing.goalId;
    try {
      await this.googleCalendar.removeTaskEvent(userId, existing);
    } catch {
      /* local delete proceeds even if Google API fails */
    }
    await super.remove(id, userId);
    if (goalId) {
      await this.syncLinkedGoalProgress(userId, goalId);
    }
    await invalidateDashboardOverview(this.cache, userId);
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
    if (dto.completionNote) {
      task.completionNote = dto.completionNote;
    } else if (dto.notes) {
      task.completionNote = dto.notes;
    }
    if (task.timerStartedAt && dto.timeSpentMinutes === 0) {
      const elapsed = Math.round(
        (Date.now() - new Date(task.timerStartedAt).getTime()) / 60000,
      );
      if (elapsed > 0) task.timeSpentMinutes = elapsed;
    }
    task.timerStartedAt = undefined;
    let saved = await this.repository.save(task);
    await this.logTaskCompletion(userId, saved, dto.notes);
    saved = await this.persistCalendarSync(userId, saved);
    if (saved.goalId) {
      await this.syncLinkedGoalProgress(userId, saved.goalId);
    }
    await invalidateDashboardOverview(this.cache, userId);
    return saved;
  }

  /** Ensure tasks without explicit schedule still sync to Google Calendar. */
  private normalizeScheduleFields(dto: DeepPartial<Task>): DeepPartial<Task> {
    const patch = { ...dto };
    if (patch.syncToCalendar === false) return patch;

    const hasSchedule =
      patch.scheduledAt || patch.startDate || patch.dueDate;
    if (!hasSchedule) {
      const today = format(new Date(), 'yyyy-MM-dd');
      patch.dueDate = endOfDay(new Date(today)).toISOString();
      if (!patch.scheduledAt) {
        const at = new Date();
        at.setHours(9, 0, 0, 0);
        patch.scheduledAt = at.toISOString();
      }
    } else if (patch.dueDate && !patch.scheduledAt) {
      patch.scheduledAt = patch.dueDate;
    }
    if (patch.syncToCalendar == null) {
      patch.syncToCalendar = false;
    }
    return patch;
  }

  private async persistCalendarSync(
    userId: string,
    task: Task,
    previousEventId?: string,
  ): Promise<Task> {
    try {
      const synced = await this.googleCalendar.syncTask(userId, task);
      if (
        synced.googleCalendarEventId !== previousEventId ||
        synced.googleCalendarEventId !== task.googleCalendarEventId
      ) {
        return this.repository.save(synced);
      }
      return synced;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      return task;
    }
  }

  /** Roll goal progress from linked task completion (measurable). */
  private async syncLinkedGoalProgress(
    userId: string,
    goalId: string,
  ): Promise<void> {
    const goal = await this.goalsRepo.findOne({
      where: { id: goalId, createdBy: userId },
    });
    if (!goal) return;

    const linked = await this.repository.find({
      where: { goalId, createdBy: userId },
    });
    if (linked.length === 0) return;

    const completed = linked.filter(
      (t) => t.taskStatus === TaskStatus.DONE,
    ).length;
    const target =
      goal.measurableTarget && goal.measurableTarget > 0
        ? goal.measurableTarget
        : linked.length;

    goal.progress = Math.min(
      100,
      Math.round((completed / target) * 1000) / 10,
    );
    const saved = await this.goalsRepo.save(goal);
    await this.googleCalendar.syncGoal(userId, saved);
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

    const financialKeywords =
      /\b(pay|bill|rent|loan|utility|electricity|subscription|transfer|save|savings)\b/i;
    const suggestRecordTransaction =
      task.lifeArea === LifeArea.FINANCE ||
      financialKeywords.test(task.title) ||
      financialKeywords.test(task.description ?? '');

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
        suggestRecordTransaction,
      },
    });
  }
}
