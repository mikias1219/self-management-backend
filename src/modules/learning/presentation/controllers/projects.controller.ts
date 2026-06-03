import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUserPayload, CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CreateLearningProjectDto } from '../../application/dto/create-learning-project.dto';
import { UpdateLearningProjectDto } from '../../application/dto/update-learning-project.dto';
import { LearningProjectsService } from '../../application/services/projects.service';

@ApiTags('learning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('learning/projects')
export class LearningProjectsController {
  constructor(private readonly service: LearningProjectsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUserPayload) {
    return this.service.findAllForUser(user.sub);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.findOneForUser(user.sub, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateLearningProjectDto) {
    return this.service.create(dto, user.sub);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUserPayload, @Param('id') id: string, @Body() dto: UpdateLearningProjectDto) {
    return this.service.update(id, dto, user.sub);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.remove(id, user.sub);
  }
}
