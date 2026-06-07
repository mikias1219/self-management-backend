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
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CreateTaskDto } from '../../application/dto/create-task.dto';
import { ReportTaskDto } from '../../application/dto/report-task.dto';
import { TaskQueryDto } from '../../application/dto/task-query.dto';
import { UpdateTaskDto } from '../../application/dto/update-task.dto';
import { TasksService } from '../../application/services/tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: TaskQueryDto,
  ) {
    return this.service.findAllFiltered(user.sub, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.findOneForUser(user.sub, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateTaskDto) {
    return this.service.create(dto, user.sub);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.service.update(id, dto, user.sub);
  }

  @Post(':id/report')
  report(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() dto: ReportTaskDto,
  ) {
    return this.service.reportTask(user.sub, id, dto);
  }

  @Post(':id/start-timer')
  startTimer(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.startTimer(user.sub, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.remove(id, user.sub);
  }
}
