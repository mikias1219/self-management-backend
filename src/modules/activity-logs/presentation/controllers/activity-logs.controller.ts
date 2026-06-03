import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import {
  AuthUserPayload,
  CurrentUser,
} from '../../../../common/decorators/current-user.decorator';
import { DateRangeQueryDto } from '../../../../common/dto/date-range.dto';
import { ActivityLogsService } from '../../application/services/activity-logs.service';

@ApiTags('activity-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly service: ActivityLogsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: DateRangeQueryDto,
  ) {
    if (query.period || query.startDate) {
      return this.service.findByUser(user.sub, query);
    }
    return this.service.findAll(user.sub);
  }
}
