import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { startOfDay, subDays } from 'date-fns';
import { Repository } from 'typeorm';
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
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.HABITS,
      entityType: 'Habit',
    });
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
      metadata: { habitId, ...dto },
    });
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
