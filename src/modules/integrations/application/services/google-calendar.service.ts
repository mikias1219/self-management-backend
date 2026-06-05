import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { calendar_v3, google } from 'googleapis';
import { SettingsService } from '../../../settings/application/services/settings.service';
import type {
  CalendarEventPreview,
  GoogleCalendarIntegration,
} from '../../../settings/domain/types/user-integrations.type';
import { Goal } from '../../../goals/domain/entities/goal.entity';
import { Habit } from '../../../habits/domain/entities/habit.entity';
import { HabitFrequency } from '../../../habits/domain/enums/habit.enums';
import { Task } from '../../../tasks/domain/entities/task.entity';
import { TaskStatus } from '../../../tasks/domain/enums/task.enums';

/** Full calendar + events scopes so existing tokens can create/update/delete events. */
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly settingsService: SettingsService,
    private readonly jwtService: JwtService,
  ) {}

  isConfigured(): boolean {
    const clientId = this.config.get<string>('google.clientId');
    const clientSecret = this.config.get<string>('google.clientSecret');
    return !!(clientId?.trim() && clientSecret?.trim());
  }

  getAuthUrl(userId: string): string {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Google Calendar is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      );
    }
    const oauth2 = this.createOAuthClient();
    const state = this.jwtService.sign(
      { sub: userId, purpose: 'google-calendar' },
      { expiresIn: '15m' },
    );
    return oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: CALENDAR_SCOPES,
      state,
    });
  }

  async connect(
    userId: string,
    code: string,
    state: string,
  ): Promise<{ email?: string; syncReady?: boolean }> {
    const payload = this.verifyState(state);
    if (payload.sub !== userId) {
      throw new BadRequestException('Invalid OAuth state');
    }

    try {
      const oauth2 = this.createOAuthClient();
      const { tokens } = await oauth2.getToken(code);
      const settings = await this.settingsService.getForUser(userId);
      const existing = settings.integrations?.googleCalendar;

      // Never reuse an old refresh token — it keeps stale OAuth scopes and causes
      // "insufficient authentication scopes" on calendar.events.insert.
      if (!tokens.refresh_token) {
        throw new BadRequestException(
          'Google did not issue a new refresh token. Open https://myaccount.google.com/permissions, remove access for this app, click Disconnect in LifeOS, then Connect Google again.',
        );
      }
      const refreshToken = tokens.refresh_token;

      oauth2.setCredentials({ ...tokens, refresh_token: refreshToken });

      let email = existing?.email;
      try {
        const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 });
        const profile = await oauth2Api.userinfo.get();
        email = profile.data.email ?? email;
      } catch (profileErr) {
        this.logger.warn(`userinfo.get failed: ${profileErr}`);
      }

      settings.integrations = {
        ...settings.integrations,
        googleCalendar: {
          connected: true,
          refreshToken,
          accessToken: tokens.access_token ?? undefined,
          expiryDate: tokens.expiry_date ?? undefined,
          calendarId: existing?.calendarId ?? 'primary',
          email,
          scope: tokens.scope ?? undefined,
        },
      };
      await this.settingsService.saveSettings(settings);

      const probe = await this.probeCalendarWrite(userId);
      if (!probe.ok) {
        throw new BadRequestException(probe.message);
      }

      return { email, syncReady: true };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      const msg =
        err instanceof Error ? err.message : String(err);
      this.logger.error(`Google connect failed: ${msg}`);
      if (msg.includes('invalid_grant')) {
        throw new BadRequestException(
          'Authorization expired. Click Connect Google again (do not refresh this page).',
        );
      }
      throw new BadRequestException(
        `Google connection failed: ${msg}`,
      );
    }
  }

  async disconnect(userId: string): Promise<void> {
    const settings = await this.settingsService.getForUser(userId);
    const gc = settings.integrations?.googleCalendar;
    if (gc?.refreshToken) {
      try {
        const oauth2 = this.createOAuthClient();
        await oauth2.revokeToken(gc.refreshToken);
      } catch (err) {
        this.logger.debug(`Token revoke skipped: ${err}`);
      }
    }
    settings.integrations = {
      ...settings.integrations,
      googleCalendar: { connected: false },
    };
    await this.settingsService.saveSettings(settings);
  }

  async getStatus(userId: string) {
    const settings = await this.settingsService.getForUser(userId);
    const gc = settings.integrations?.googleCalendar;
    const connected = !!gc?.connected && !!gc.refreshToken;
    let syncReady = false;
    let scopeError: string | null = null;
    let setupError: string | null = null;
    let setupHelpUrl: string | null = null;

    if (connected) {
      const probe = await this.probeCalendarWrite(userId);
      syncReady = probe.ok;
      if (!probe.ok) {
        if (probe.code === 'insufficient_scopes') {
          scopeError = 'insufficient_scopes';
        } else if (probe.code === 'api_disabled') {
          setupError = 'api_disabled';
          setupHelpUrl = probe.helpUrl ?? null;
        }
      }
    }

    return {
      configured: this.isConfigured(),
      connected,
      syncReady,
      scopeError,
      setupError,
      setupHelpUrl,
      needsReconnect:
        connected && !syncReady && setupError !== 'api_disabled',
      email: gc?.email ?? null,
      calendarId: gc?.calendarId ?? 'primary',
    };
  }

  /** Read events from the user's connected Google Calendar (OAuth). */
  async listEventsInRange(
    userId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<CalendarEventPreview[]> {
    const integration = await this.getIntegration(userId);
    if (!integration) return [];

    try {
      const calendar = await this.getCalendarClient(userId);
      const res = await calendar.events.list({
        calendarId: integration.calendarId ?? 'primary',
        timeMin: rangeStart.toISOString(),
        timeMax: rangeEnd.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100,
      });

      const events: CalendarEventPreview[] = [];
      for (const ev of res.data.items ?? []) {
        if (ev.status === 'cancelled') continue;

        const allDay = !!ev.start?.date && !ev.start?.dateTime;
        let start: string;
        let end: string;

        if (allDay && ev.start?.date) {
          const [y, m, d] = ev.start.date.split('-').map(Number);
          const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
          start = dayStart.toISOString();
          const endDateStr = ev.end?.date ?? ev.start.date;
          const [ey, em, ed] = endDateStr.split('-').map(Number);
          const dayEnd = new Date(ey, em - 1, ed, 23, 59, 59, 999);
          end = dayEnd.toISOString();
        } else {
          start = ev.start?.dateTime ?? new Date().toISOString();
          end = ev.end?.dateTime ?? start;
        }

        events.push({
          uid: ev.id ?? ev.iCalUID ?? `gcal-${start}`,
          title: ev.summary?.trim() || 'Untitled',
          start,
          end,
          allDay,
          recurring: !!ev.recurringEventId,
        });
      }
      return events;
    } catch (err) {
      this.logger.warn(
        `Google Calendar events.list failed: ${err instanceof Error ? err.message : err}`,
      );
      return [];
    }
  }

  /** Verify token can list/write calendar events (catches stale OAuth scopes). */
  private async probeCalendarWrite(
    userId: string,
  ): Promise<
    | { ok: true }
    | { ok: false; code?: string; message: string; helpUrl?: string }
  > {
    try {
      const calendar = await this.getCalendarClient(userId);
      await calendar.events.list({
        calendarId: 'primary',
        maxResults: 1,
        timeMin: new Date().toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('insufficient authentication scopes')) {
        return {
          ok: false,
          code: 'insufficient_scopes',
          message:
            'Calendar permissions are outdated. Disconnect, remove this app at https://myaccount.google.com/permissions, then Connect Google again.',
        };
      }
      if (
        msg.includes('has not been used') ||
        msg.includes('is disabled') ||
        msg.includes('calendar-json.googleapis.com')
      ) {
        const projectMatch = msg.match(/project\s+(\d+)/i);
        const helpUrl = projectMatch
          ? `https://console.cloud.google.com/apis/library/calendar-json.googleapis.com?project=${projectMatch[1]}`
          : 'https://console.cloud.google.com/apis/library/calendar-json.googleapis.com';
        return {
          ok: false,
          code: 'api_disabled',
          helpUrl,
          message:
            'Google Calendar API is not enabled for your Cloud project. Enable it in Google Cloud Console, wait 1–2 minutes, then click Reconnect Google in LifeOS.',
        };
      }
      if (msg.includes('invalid_grant')) {
        return {
          ok: false,
          code: 'invalid_grant',
          message: 'Google authorization expired. Connect Google Calendar again.',
        };
      }
      return {
        ok: false,
        message: `Calendar access check failed: ${msg}`,
      };
    }
  }

  async syncTask(userId: string, task: Task): Promise<Task> {
    if (!task.syncToCalendar) {
      await this.removeTaskEvent(userId, task);
      task.googleCalendarEventId = undefined;
      return task;
    }
    const integration = await this.getIntegration(userId);
    if (!integration) return task;

    try {
      const calendar = await this.getCalendarClient(userId);
      const event = this.taskToEvent(task);
      if (!event) {
        if (task.googleCalendarEventId) {
          await this.deleteEvent(calendar, integration, task.googleCalendarEventId);
          task.googleCalendarEventId = undefined;
        }
        return task;
      }

      if (task.googleCalendarEventId) {
        await calendar.events.update({
          calendarId: integration.calendarId ?? 'primary',
          eventId: task.googleCalendarEventId,
          requestBody: event,
        });
      } else {
        const res = await calendar.events.insert({
          calendarId: integration.calendarId ?? 'primary',
          requestBody: event,
        });
        task.googleCalendarEventId = res.data.id ?? undefined;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Calendar sync failed for task ${task.id}: ${msg}`);
      if (msg.includes('insufficient authentication scopes')) {
        throw new BadRequestException(
          'Google Calendar permissions are outdated. Disconnect, revoke the app at https://myaccount.google.com/permissions, then Connect Google again.',
        );
      }
      throw err;
    }
    return task;
  }

  async removeTaskEvent(userId: string, task: Task): Promise<void> {
    if (!task.googleCalendarEventId) return;
    const integration = await this.getIntegration(userId);
    if (!integration) return;
    const eventId = task.googleCalendarEventId;
    try {
      const calendar = await this.getCalendarClient(userId);
      await this.deleteEvent(calendar, integration, eventId);
    } catch (err) {
      const msg = String(err);
      if (msg.includes('404') || msg.includes('Not Found')) {
        this.logger.debug(`Calendar event already gone: ${eventId}`);
        return;
      }
      this.logger.warn(`Calendar delete failed for task ${task.id}: ${err}`);
      throw err;
    }
  }

  async syncGoal(userId: string, goal: Goal): Promise<Goal> {
    if (!goal.syncToCalendar || !goal.targetDate) return goal;
    const integration = await this.getIntegration(userId);
    if (!integration) return goal;

    try {
      const calendar = await this.getCalendarClient(userId);
      const event: calendar_v3.Schema$Event = {
        summary: `[Goal] ${goal.title}`,
        description: goal.description ?? `LifeOS goal · ${goal.level} · ${goal.progress}%`,
        start: { date: goal.targetDate },
        end: { date: goal.targetDate },
        colorId: '9',
      };

      if (goal.googleCalendarEventId) {
        await calendar.events.update({
          calendarId: integration.calendarId ?? 'primary',
          eventId: goal.googleCalendarEventId,
          requestBody: event,
        });
      } else {
        const res = await calendar.events.insert({
          calendarId: integration.calendarId ?? 'primary',
          requestBody: event,
        });
        goal.googleCalendarEventId = res.data.id ?? undefined;
      }
    } catch (err) {
      this.logger.warn(`Calendar sync failed for goal ${goal.id}: ${err}`);
    }
    return goal;
  }

  async removeGoalEvent(userId: string, goal: Goal): Promise<void> {
    if (!goal.googleCalendarEventId) return;
    const integration = await this.getIntegration(userId);
    if (!integration) return;
    try {
      const calendar = await this.getCalendarClient(userId);
      await this.deleteEvent(calendar, integration, goal.googleCalendarEventId);
    } catch (err) {
      this.logger.warn(`Calendar delete failed for goal ${goal.id}: ${err}`);
    }
  }

  async syncHabit(userId: string, habit: Habit): Promise<Habit> {
    if (!habit.syncToCalendar) return habit;
    const integration = await this.getIntegration(userId);
    if (!integration) return habit;

    try {
      const calendar = await this.getCalendarClient(userId);
      const [hours, minutes] = (habit.reminderTime ?? '08:00').split(':').map(Number);
      const start = new Date();
      start.setHours(hours || 8, minutes || 0, 0, 0);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + 30);

      const freqMap: Record<HabitFrequency, string> = {
        [HabitFrequency.DAILY]: 'DAILY',
        [HabitFrequency.WEEKLY]: 'WEEKLY',
        [HabitFrequency.MONTHLY]: 'MONTHLY',
        [HabitFrequency.YEARLY]: 'YEARLY',
      };
      const freq = freqMap[habit.frequency] ?? 'DAILY';

      const event: calendar_v3.Schema$Event = {
        summary: `[Habit] ${habit.name}`,
        description: [
          habit.description,
          `Streak: ${habit.currentStreak} days`,
          'Tracked in LifeOS',
        ]
          .filter(Boolean)
          .join('\n'),
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        recurrence: [`RRULE:FREQ=${freq}`],
        colorId: '2',
      };

      if (habit.googleCalendarEventId) {
        await calendar.events.update({
          calendarId: integration.calendarId ?? 'primary',
          eventId: habit.googleCalendarEventId,
          requestBody: event,
        });
      } else {
        const res = await calendar.events.insert({
          calendarId: integration.calendarId ?? 'primary',
          requestBody: event,
        });
        habit.googleCalendarEventId = res.data.id ?? undefined;
      }
    } catch (err) {
      this.logger.warn(`Calendar sync failed for habit ${habit.id}: ${err}`);
    }
    return habit;
  }

  async removeHabitEvent(userId: string, habit: Habit): Promise<void> {
    if (!habit.googleCalendarEventId) return;
    const integration = await this.getIntegration(userId);
    if (!integration) return;
    try {
      const calendar = await this.getCalendarClient(userId);
      await this.deleteEvent(calendar, integration, habit.googleCalendarEventId);
    } catch (err) {
      this.logger.warn(`Calendar delete failed for habit ${habit.id}: ${err}`);
    }
  }

  private verifyState(state: string): { sub: string } {
    try {
      const payload = this.jwtService.verify<{ sub: string; purpose?: string }>(
        state,
      );
      if (payload.purpose !== 'google-calendar') {
        throw new BadRequestException('Invalid OAuth state');
      }
      return payload;
    } catch {
      throw new BadRequestException('Invalid or expired OAuth state');
    }
  }

  private createOAuthClient() {
    return new google.auth.OAuth2(
      this.config.get<string>('google.clientId'),
      this.config.get<string>('google.clientSecret'),
      this.config.get<string>('google.redirectUri'),
    );
  }

  private async getIntegration(
    userId: string,
  ): Promise<GoogleCalendarIntegration | null> {
    const settings = await this.settingsService.getForUser(userId);
    const gc = settings.integrations?.googleCalendar;
    if (!gc?.connected || !gc.refreshToken) return null;
    return gc;
  }

  private async getCalendarClient(userId: string) {
    const integration = await this.getIntegration(userId);
    if (!integration?.refreshToken) {
      throw new BadRequestException('Google Calendar not connected');
    }

    const oauth2 = this.createOAuthClient();
    oauth2.setCredentials({
      refresh_token: integration.refreshToken,
      access_token: integration.accessToken,
      expiry_date: integration.expiryDate,
    });

    oauth2.on('tokens', async (tokens) => {
      const settings = await this.settingsService.getForUser(userId);
      settings.integrations = {
        ...settings.integrations,
        googleCalendar: {
          ...settings.integrations?.googleCalendar,
          connected: true,
          refreshToken: integration.refreshToken,
          accessToken: tokens.access_token ?? integration.accessToken,
          expiryDate: tokens.expiry_date ?? integration.expiryDate,
          calendarId: integration.calendarId ?? 'primary',
          email: integration.email,
        },
      };
      await this.settingsService.saveSettings(settings);
    });

    return google.calendar({ version: 'v3', auth: oauth2 });
  }

  private taskToEvent(task: Task): calendar_v3.Schema$Event | null {
    let anchor = task.scheduledAt ?? task.startDate ?? task.dueDate;
    if (!anchor) {
      const fallback = new Date();
      fallback.setHours(9, 0, 0, 0);
      anchor = fallback;
    }

    const start = new Date(anchor);
    const end = new Date(start);
    const mins = task.estimatedMinutes ?? 60;
    end.setMinutes(end.getMinutes() + mins);

    const statusPrefix =
      task.taskStatus === TaskStatus.DONE
        ? '✓ '
        : task.taskStatus === TaskStatus.IN_PROGRESS
          ? '▶ '
          : '';

    return {
      summary: `${statusPrefix}${task.title}`,
      description: [
        task.description,
        task.lifeArea ? `Life area: ${task.lifeArea}` : null,
        task.estimatedMinutes ? `Planned: ${task.estimatedMinutes} min` : null,
        'Created in LifeOS',
      ]
        .filter(Boolean)
        .join('\n'),
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      colorId: task.priority === 'urgent' ? '11' : task.priority === 'high' ? '6' : '1',
    };
  }

  private async deleteEvent(
    calendar: calendar_v3.Calendar,
    integration: GoogleCalendarIntegration,
    eventId: string,
  ) {
    await calendar.events.delete({
      calendarId: integration.calendarId ?? 'primary',
      eventId,
    });
  }
}
