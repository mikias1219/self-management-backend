import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import ical, { expandRecurringEvent } from 'node-ical';
import { SettingsService } from '../../../settings/application/services/settings.service';
import type {
  CalendarEventPreview,
  CalendarFeedConfig,
} from '../../../settings/domain/types/user-integrations.type';

@Injectable()
export class IcalCalendarService {
  private readonly logger = new Logger(IcalCalendarService.name);

  constructor(
    private readonly settingsService: SettingsService,
    private readonly config: ConfigService,
  ) {}

  private envDefaults(): CalendarFeedConfig {
    return {
      embedSrc: this.config.get<string>('calendar.defaultEmbedSrc') || undefined,
      icalFeedUrl: this.config.get<string>('calendar.defaultIcalUrl') || undefined,
      timezone:
        this.config.get<string>('calendar.defaultTimezone') ?? 'Africa/Nairobi',
    };
  }

  async getFeedConfig(userId: string): Promise<
    CalendarFeedConfig & { usingDefaults?: boolean }
  > {
    const settings = await this.settingsService.getForUser(userId);
    const stored = settings.integrations?.calendarFeed ?? {};
    const defaults = this.envDefaults();
    const usingDefaults = !stored.icalFeedUrl && !!defaults.icalFeedUrl;
    return {
      timezone: stored.timezone ?? defaults.timezone ?? 'Africa/Nairobi',
      embedSrc: stored.embedSrc ?? defaults.embedSrc,
      icalFeedUrl: stored.icalFeedUrl ?? defaults.icalFeedUrl,
      usingDefaults,
    };
  }

  async updateFeedConfig(
    userId: string,
    patch: CalendarFeedConfig,
  ): Promise<CalendarFeedConfig> {
    if (patch.icalFeedUrl && !patch.icalFeedUrl.includes('calendar.google.com')) {
      throw new BadRequestException(
        'iCal URL must be a Google Calendar private address',
      );
    }

    const settings = await this.settingsService.getForUser(userId);
    settings.integrations = {
      ...settings.integrations,
      calendarFeed: {
        ...settings.integrations?.calendarFeed,
        ...patch,
      },
    };
    await this.settingsService.saveSettings(settings);
    return settings.integrations!.calendarFeed!;
  }

  async getUpcomingEvents(
    userId: string,
    days = 14,
  ): Promise<{
    configured: boolean;
    timezone: string;
    embedSrc: string | null;
    events: CalendarEventPreview[];
  }> {
    const feed = await this.getFeedConfig(userId);
    const timezone = feed.timezone ?? 'Africa/Nairobi';

    if (!feed.icalFeedUrl?.trim()) {
      return {
        configured: false,
        timezone,
        embedSrc: feed.embedSrc ?? null,
        events: [],
      };
    }

    try {
      const parsed = await ical.async.fromURL(feed.icalFeedUrl);
      const now = new Date();
      const rangeEnd = endOfDay(addDays(now, days));
      const rangeStart = startOfDay(now);
      const events: CalendarEventPreview[] = [];

      for (const key of Object.keys(parsed)) {
        const item = parsed[key];
        if (!item || item.type !== 'VEVENT') continue;

        if (item.rrule) {
          const instances = expandRecurringEvent(item, {
            from: rangeStart,
            to: rangeEnd,
            expandOngoing: true,
          });
          for (const inst of instances) {
            events.push({
              uid: `${String(item.uid ?? key)}-${inst.start.getTime()}`,
              title: String(inst.summary ?? item.summary ?? 'Untitled'),
              start: inst.start.toISOString(),
              end: inst.end.toISOString(),
              allDay: inst.isFullDay,
              recurring: true,
            });
          }
          continue;
        }

        const start = item.start instanceof Date ? item.start : new Date(item.start);
        const end =
          item.end instanceof Date
            ? item.end
            : item.end
              ? new Date(item.end)
              : start;

        if (end < rangeStart || start > rangeEnd) continue;

        events.push({
          uid: String(item.uid ?? key),
          title: String(item.summary ?? 'Untitled'),
          start: start.toISOString(),
          end: end.toISOString(),
          allDay:
            !item.start ||
            (start.getHours() === 0 &&
              start.getMinutes() === 0 &&
              end.getTime() - start.getTime() >= 23 * 60 * 60 * 1000),
          recurring: false,
        });
      }

      events.sort((a, b) => a.start.localeCompare(b.start));

      return {
        configured: true,
        timezone,
        embedSrc: feed.embedSrc ?? null,
        events: events.slice(0, 80),
      };
    } catch (err) {
      this.logger.warn(`iCal fetch failed: ${err}`);
      throw new BadRequestException(
        'Could not load calendar feed. Check your iCal URL in settings.',
      );
    }
  }

  buildEmbedUrl(embedSrc: string, timezone = 'Africa/Nairobi'): string {
    const src = encodeURIComponent(embedSrc);
    const ctz = encodeURIComponent(timezone);
    return `https://calendar.google.com/calendar/embed?src=${src}&ctz=${ctz}`;
  }
}
