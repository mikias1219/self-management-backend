import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Task } from '../../../tasks/domain/entities/task.entity';
import { TaskStatus } from '../../../tasks/domain/enums/task.enums';
import { SettingsService } from '../../../settings/application/services/settings.service';
import { UserSettings } from '../../../settings/domain/entities/user-settings.entity';

function formatIcsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

@Injectable()
export class LifeosCalendarExportService {
  constructor(
    @InjectRepository(Task) private readonly tasksRepo: Repository<Task>,
    @InjectRepository(UserSettings)
    private readonly settingsRepo: Repository<UserSettings>,
    private readonly settingsService: SettingsService,
    private readonly config: ConfigService,
  ) {}

  async getOrCreateExportInfo(userId: string, requestOrigin?: string) {
    const settings = await this.settingsService.getForUser(userId);
    let token = settings.integrations?.lifeosExport?.token;
    if (!token) {
      token = randomBytes(24).toString('hex');
      settings.integrations = {
        ...settings.integrations,
        lifeosExport: { token, createdAt: new Date().toISOString() },
      };
      await this.settingsService.saveSettings(settings);
    }

    const base =
      this.config.get<string>('apiPublicUrl') ??
      requestOrigin ??
      'http://localhost:4000';
    const prefix = base.replace(/\/$/, '');
    const apiPrefix = this.config.get<string>('apiPrefix') ?? 'api/v1';
    const feedUrl = `${prefix}/${apiPrefix}/integrations/calendar/export/${token}.ics`;

    return {
      token,
      feedUrl,
      googleSubscribeUrl: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`,
      note:
        'Google can only subscribe if this URL is reachable on the internet (not localhost). For local dev, use Download .ics and import manually.',
    };
  }

  async buildIcsForUser(userId: string): Promise<string> {
    const now = new Date();
    const rangeEnd = endOfDay(addDays(now, 90));

    const tasks = await this.tasksRepo.find({
      where: { createdBy: userId },
      order: { scheduledAt: 'ASC', dueDate: 'ASC' },
    });

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LifeOS//Tasks//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:LifeOS Tasks',
    ];

    for (const task of tasks) {
      if (task.taskStatus === TaskStatus.CANCELLED) continue;
      const anchor = task.scheduledAt ?? task.dueDate ?? task.startDate;
      if (!anchor) continue;
      const start = new Date(anchor);
      if (start > rangeEnd) continue;

      const end = new Date(start);
      end.setMinutes(end.getMinutes() + (task.estimatedMinutes ?? 60));

      const statusPrefix =
        task.taskStatus === TaskStatus.DONE
          ? '✓ '
          : task.taskStatus === TaskStatus.IN_PROGRESS
            ? '▶ '
            : '';

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:lifeos-task-${task.id}@lifeos`);
      lines.push(`DTSTAMP:${formatIcsUtc(now)}`);
      lines.push(`DTSTART:${formatIcsUtc(start)}`);
      lines.push(`DTEND:${formatIcsUtc(end)}`);
      lines.push(`SUMMARY:${escapeIcsText(`${statusPrefix}${task.title}`)}`);
      if (task.description) {
        lines.push(`DESCRIPTION:${escapeIcsText(task.description)}`);
      }
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  async buildIcsByToken(token: string): Promise<string> {
    const settings = await this.settingsRepo
      .createQueryBuilder('s')
      .where("s.integrations->'lifeosExport'->>'token' = :token", { token })
      .getOne();

    if (!settings?.createdBy) {
      throw new NotFoundException('Calendar feed not found');
    }

    return this.buildIcsForUser(settings.createdBy);
  }
}
