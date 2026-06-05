import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { invalidateDashboardOverview } from '../../../../common/utils/dashboard-cache.util';
import { startOfDay, subDays } from 'date-fns';
import { DeepPartial, Repository } from 'typeorm';
import { GoogleCalendarService } from '../../../integrations/application/services/google-calendar.service';
import {
  ActivityAction,
  ActivityModule,
} from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { Habit } from '../../domain/entities/habit.entity';
import { HabitLog } from '../../domain/entities/habit-log.entity';
import { CreateHabitLogDto } from '../dto/create-habit-log.dto';

@Injectable()
export class HabitsService extends BaseCrudService<Habit> {
  protected override readonly relations = { logs: true };

  constructor(
    @InjectRepository(Habit)
    repository: Repository<Habit>,
    @InjectRepository(HabitLog)
    private readonly habitLogRepo: Repository<HabitLog>,
    activityLogs: ActivityLogsService,
    private readonly googleCalendar: GoogleCalendarService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.HABITS,
      entityType: 'Habit',
    });
  }

  override async create(
    dto: DeepPartial<Habit>,
    userId: string,
  ): Promise<Habit> {
    let saved = await super.create(
      { syncToCalendar: true, reminderTime: '08:00', ...dto },
      userId,
    );
    saved = await this.googleCalendar.syncHabit(userId, saved);
    if (saved.googleCalendarEventId) {
      saved = await this.repository.save(saved);
    }
    return saved;
  }

  override async update(
    id: string,
    dto: DeepPartial<Habit>,
    userId: string,
  ): Promise<Habit> {
    const existing = await this.findOneForUser(userId, id);
    let saved = await super.update(id, dto, userId);
    saved = await this.googleCalendar.syncHabit(userId, saved);
    if (saved.googleCalendarEventId !== existing.googleCalendarEventId) {
      saved = await this.repository.save(saved);
    }
    return saved;
  }

  override async remove(id: string, userId: string): Promise<void> {
    const existing = await this.findOneForUser(userId, id);
    await this.googleCalendar.removeHabitEvent(userId, existing);
    await super.remove(id, userId);
  }

  async createLog(
    userId: string,
    habitId: string,
    dto: CreateHabitLogDto,
  ): Promise<HabitLog> {
    await this.findOneForUser(userId, habitId);
    const log = this.habitLogRepo.create({
      habitId,
      completedAt: new Date(dto.completedAt),
      notes: dto.notes,
      createdBy: userId,
    });
    const saved = await this.habitLogRepo.save(log);
    const habit = await this.findOneForUser(userId, habitId);
    const completedDay = startOfDay(new Date(dto.completedAt));
    const yesterday = startOfDay(subDays(completedDay, 1));
    const recentDays = new Set(
      (habit.logs ?? []).map((l) => startOfDay(l.completedAt).getTime()),
    );
    if (recentDays.has(completedDay.getTime())) {
      return saved;
    }
    const hadYesterday = recentDays.has(yesterday.getTime());
    const nextStreak = hadYesterday ? habit.currentStreak + 1 : 1;
    habit.currentStreak = nextStreak;
    habit.bestStreak = Math.max(habit.bestStreak, nextStreak);
    await this.repository.save(habit);
    await this.activityLogs.log({
      userId,
      module: ActivityModule.HABITS,
      action: ActivityAction.LOGGED,
      entityType: 'HabitLog',
      entityId: saved.id,
      description: `Logged habit: ${habit.name}`,
      metadata: { habitId, habitName: habit.name, ...dto },
    });
    if (nextStreak >= 7 && nextStreak % 7 === 0) {
      await this.activityLogs.log({
        userId,
        module: ActivityModule.HABITS,
        action: ActivityAction.COMPLETED,
        entityType: 'Habit',
        entityId: habitId,
        description: `${habit.name} — ${nextStreak}-day streak`,
        metadata: { streak: nextStreak },
      });
    }
    await invalidateDashboardOverview(this.cache, userId);
    return saved;
  }

  async findLogs(userId: string, habitId: string): Promise<HabitLog[]> {
    const habit = await this.findOneForUser(userId, habitId);
    const logs = habit.logs ?? [];
    return [...logs].sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );
  }
}
