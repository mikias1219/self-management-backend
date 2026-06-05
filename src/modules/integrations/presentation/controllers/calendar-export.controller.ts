import { Controller, Get, Header, Param, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { LifeosCalendarExportService } from '../../application/services/lifeos-calendar-export.service';

/** Public iCal feed — no JWT (Google Calendar fetches this URL). */
@ApiTags('integrations')
@Controller('integrations/calendar/export')
export class CalendarExportController {
  constructor(private readonly exportService: LifeosCalendarExportService) {}

  @Get(':token')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Cache-Control', 'private, max-age=300')
  async feed(@Param('token') raw: string) {
    const token = raw.replace(/\.ics$/i, '');
    return this.exportService.buildIcsByToken(token);
  }
}
