import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthUserPayload,
  CurrentUser,
} from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CreateHabitDto } from '../../application/dto/create-habit.dto';
import { UpdateHabitDto } from '../../application/dto/update-habit.dto';
import { HabitsService } from '../../application/services/habits.service';

@ApiTags('habits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('habits')
export class HabitsController {
  constructor(private readonly service: HabitsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUserPayload) {
    return this.service.findAllForUser(user.sub);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.findOneForUser(user.sub, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateHabitDto) {
    return this.service.create(dto, user.sub);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateHabitDto,
  ) {
    return this.service.update(id, dto, user.sub);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.remove(id, user.sub);
  }
}
