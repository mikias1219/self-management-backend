import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUserPayload, CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CreateCourseDto } from '../../application/dto/create-course.dto';
import { UpdateCourseDto } from '../../application/dto/update-course.dto';
import { CoursesService } from '../../application/services/courses.service';

@ApiTags('learning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('learning/courses')
export class CoursesController {
  constructor(private readonly service: CoursesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUserPayload) {
    return this.service.findAllForUser(user.sub);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.findOneForUser(user.sub, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateCourseDto) {
    return this.service.create(dto, user.sub);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUserPayload, @Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.service.update(id, dto, user.sub);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.remove(id, user.sub);
  }
}
