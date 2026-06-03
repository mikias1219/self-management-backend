import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthUserPayload,
  CurrentUser,
} from '../../../../common/decorators/current-user.decorator';
import { DateRangeQueryDto } from '../../../../common/dto/date-range.dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CreateDailyPlanDto } from '../../application/dto/create-daily-plan.dto';
import { ReportDailyPlanDto } from '../../application/dto/report-daily-plan.dto';
import { UpdateDailyPlanDto } from '../../application/dto/update-daily-plan.dto';
import { DailyPlansService } from '../../application/services/daily-plans.service';

@ApiTags('daily-plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('daily-plans')
export class DailyPlansController {
  constructor(private readonly service: DailyPlansService) {}

  @Get()
  findForPeriod(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.service.findForPeriod(user.sub, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.findOneForUser(user.sub, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: CreateDailyPlanDto,
  ) {
    return this.service.createPlan(user.sub, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDailyPlanDto,
  ) {
    return this.service.updatePlan(user.sub, id, dto);
  }

  @Post(':id/start')
  start(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.startPlan(user.sub, id);
  }

  @Post(':id/report')
  report(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() dto: ReportDailyPlanDto,
  ) {
    return this.service.reportPlan(user.sub, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.remove(id, user.sub);
  }
}
