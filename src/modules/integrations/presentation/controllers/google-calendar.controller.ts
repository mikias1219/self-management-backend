import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthUserPayload,
  CurrentUser,
} from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ConnectGoogleDto } from '../../application/dto/connect-google.dto';
import { UpdateCalendarFeedDto } from '../../application/dto/update-calendar-feed.dto';
import { GoogleCalendarService } from '../../application/services/google-calendar.service';
import { IcalCalendarService } from '../../application/services/ical-calendar.service';
import { LifeosCalendarExportService } from '../../application/services/lifeos-calendar-export.service';

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integrations/google-calendar')
export class GoogleCalendarController {
  constructor(
    private readonly calendar: GoogleCalendarService,
    private readonly ical: IcalCalendarService,
    private readonly lifeosExport: LifeosCalendarExportService,
  ) {}

  @Get('status')
  status(@CurrentUser() user: AuthUserPayload) {
    return this.calendar.getStatus(user.sub);
  }

  @Get('auth-url')
  authUrl(@CurrentUser() user: AuthUserPayload) {
    if (!this.calendar.isConfigured()) {
      return {
        configured: false as const,
        url: null,
        message:
          'Google Calendar OAuth is not set up. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env and restart the API.',
      };
    }
    return {
      configured: true as const,
      url: this.calendar.getAuthUrl(user.sub),
    };
  }

  @Post('connect')
  connect(@CurrentUser() user: AuthUserPayload, @Body() dto: ConnectGoogleDto) {
    return this.calendar.connect(user.sub, dto.code, dto.state);
  }

  @Delete('disconnect')
  disconnect(@CurrentUser() user: AuthUserPayload) {
    return this.calendar.disconnect(user.sub);
  }

  /** Revoke old token and return a fresh OAuth URL (fixes insufficient scopes). */
  @Post('reconnect')
  async reconnect(@CurrentUser() user: AuthUserPayload) {
    await this.calendar.disconnect(user.sub);
    if (!this.calendar.isConfigured()) {
      return {
        configured: false as const,
        url: null,
        message:
          'Google Calendar OAuth is not set up. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env.',
      };
    }
    return {
      configured: true as const,
      url: this.calendar.getAuthUrl(user.sub),
    };
  }

  @Get('feed')
  getFeedConfig(@CurrentUser() user: AuthUserPayload) {
    return this.ical.getFeedConfig(user.sub);
  }

  @Patch('feed')
  updateFeedConfig(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: UpdateCalendarFeedDto,
  ) {
    return this.ical.updateFeedConfig(user.sub, dto);
  }

  @Get('events')
  getEvents(
    @CurrentUser() user: AuthUserPayload,
    @Query('days') days?: string,
  ) {
    const n = days ? Math.min(60, Math.max(1, parseInt(days, 10))) : 14;
    return this.ical.getUpcomingEvents(user.sub, n);
  }

  @Get('export-info')
  exportInfo(@CurrentUser() user: AuthUserPayload, @Req() req: Request) {
    const origin = `${req.protocol}://${req.get('host')}`;
    return this.lifeosExport.getOrCreateExportInfo(user.sub, origin);
  }

  @Get('export.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="lifeos-tasks.ics"')
  async downloadExport(@CurrentUser() user: AuthUserPayload) {
    return this.lifeosExport.buildIcsForUser(user.sub);
  }

  @Get('embed-url')
  async embedUrl(@CurrentUser() user: AuthUserPayload) {
    const feed = await this.ical.getFeedConfig(user.sub);
    const src = feed.embedSrc ?? feed.icalFeedUrl?.match(/ical\/([^/]+)/)?.[1];
    if (!src) {
      return { url: null };
    }
    const decoded = decodeURIComponent(src.replace('%40', '@'));
    return {
      url: this.ical.buildEmbedUrl(decoded, feed.timezone ?? 'Africa/Nairobi'),
    };
  }
}
