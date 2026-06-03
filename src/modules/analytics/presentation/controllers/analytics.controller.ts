import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthUserPayload,
  CurrentUser,
} from '../../../../common/decorators/current-user.decorator';
import { DateRangeQueryDto } from '../../../../common/dto/date-range.dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { AnalyticsService } from '../../application/services/analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('counts')
  getCounts(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.service.getCountsByPeriod(user.sub, query);
  }
}
