import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUserPayload, CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CreateExpenseCategoryDto } from '../../application/dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from '../../application/dto/update-expense-category.dto';
import { ExpenseCategoriesService } from '../../application/services/expense-categories.service';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance/expense-categories')
export class ExpenseCategoriesController {
  constructor(private readonly service: ExpenseCategoriesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUserPayload) {
    return this.service.findAllForUser(user.sub);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.findOneForUser(user.sub, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateExpenseCategoryDto) {
    return this.service.create(dto, user.sub);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUserPayload, @Param('id') id: string, @Body() dto: UpdateExpenseCategoryDto) {
    return this.service.update(id, dto, user.sub);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.remove(id, user.sub);
  }
}
