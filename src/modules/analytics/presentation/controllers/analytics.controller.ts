import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthUserPayload,
  CurrentUser,
} from '../../../../common/decorators/current-user.decorator';
import { DateRangeQueryDto } from '../../../../common/dto/date-range.dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { AnalyticsService } from '../../application/services/analytics.service';
import { LifeIntelligenceService } from '../../application/services/life-intelligence.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly service: AnalyticsService,
    private readonly intelligence: LifeIntelligenceService,
  ) {}

  @Get('counts')
  getCounts(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.service.getCountsByPeriod(user.sub, query);
  }

  @Get('intelligence')
  getIntelligence(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.intelligence.getUnifiedIntelligence(user.sub, query);
  }

  @Get('intelligence/finance')
  getFinanceIntelligence(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.intelligence.getFinanceIntelligence(user.sub, query);
  }

  @Get('intelligence/tasks')
  getTaskIntelligence(@CurrentUser() user: AuthUserPayload) {
    return this.intelligence.getTaskIntelligence(user.sub);
  }
}
