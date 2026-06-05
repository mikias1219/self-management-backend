import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthUserPayload,
  CurrentUser,
} from '../../../../common/decorators/current-user.decorator';
import { AnalyticsPeriod } from '../../../../common/domain/enums/period.enum';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ProductivityMetricsService } from '../../application/services/productivity-metrics.service';
import { ProductivityScheduleService } from '../../application/services/productivity-schedule.service';

@ApiTags('productivity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('productivity')
export class ProductivityController {
  constructor(
    private readonly metrics: ProductivityMetricsService,
    private readonly schedule: ProductivityScheduleService,
  ) {}

  @Get('metrics')
  getMetrics(
    @CurrentUser() user: AuthUserPayload,
    @Query('period') period?: AnalyticsPeriod,
  ) {
    if (period) {
      return this.metrics.getForPeriod(user.sub, period);
    }
    return this.metrics.getAllPeriods(user.sub);
  }

  @Get('schedule')
  getSchedule(
    @CurrentUser() user: AuthUserPayload,
    @Query('days') days?: string,
    @Query('scope') scope?: 'today' | 'upcoming',
  ) {
    const resolvedScope = scope === 'upcoming' ? 'upcoming' : 'today';
    const n = days
      ? Math.min(60, Math.max(1, parseInt(days, 10) || 1))
      : resolvedScope === 'today'
        ? 1
        : 14;
    return this.schedule.getSchedule(user.sub, n, resolvedScope);
  }
}
