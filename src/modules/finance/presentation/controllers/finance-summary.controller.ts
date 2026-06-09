import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  AuthUserPayload,
  CurrentUser,
} from '../../../../common/decorators/current-user.decorator';
import { DateRangeQueryDto } from '../../../../common/dto/date-range.dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { FinanceSummaryService } from '../../application/services/finance-summary.service';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceSummaryController {
  constructor(private readonly service: FinanceSummaryService) {}

  @Get('summary')
  getSummary(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.service.getSummary(user.sub, query);
  }

  @Get('month-summary')
  @ApiQuery({ name: 'month', required: false, example: '2026-06' })
  getMonthSummary(
    @CurrentUser() user: AuthUserPayload,
    @Query('month') month?: string,
  ) {
    return this.service.getMonthSummary(user.sub, month);
  }

  @Get('upcoming-bills')
  @ApiQuery({ name: 'days', required: false, example: '7' })
  getUpcomingBills(
    @CurrentUser() user: AuthUserPayload,
    @Query('days') days?: string,
  ) {
    const n = days ? Math.min(30, Math.max(1, parseInt(days, 10) || 7)) : 7;
    return this.service.getUpcomingBills(user.sub, n);
  }
}
