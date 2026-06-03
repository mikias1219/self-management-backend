import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthUserPayload,
  CurrentUser,
} from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CreateHabitLogDto } from '../../application/dto/create-habit-log.dto';
import { HabitsService } from '../../application/services/habits.service';

@ApiTags('habits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('habits/:habitId/logs')
export class HabitLogsController {
  constructor(private readonly service: HabitsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUserPayload,
    @Param('habitId') habitId: string,
  ) {
    return this.service.findLogs(user.sub, habitId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUserPayload,
    @Param('habitId') habitId: string,
    @Body() dto: CreateHabitLogDto,
  ) {
    return this.service.createLog(user.sub, habitId, dto);
  }
}
