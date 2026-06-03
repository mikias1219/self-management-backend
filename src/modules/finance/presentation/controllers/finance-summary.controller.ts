import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
@Controller('finance/summary')
export class FinanceSummaryController {
  constructor(private readonly service: FinanceSummaryService) {}

  @Get()
  getSummary(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.service.getSummary(user.sub, query);
  }
}
