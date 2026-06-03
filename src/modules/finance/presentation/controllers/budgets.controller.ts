import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUserPayload, CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CreateBudgetDto } from '../../application/dto/create-budget.dto';
import { UpdateBudgetDto } from '../../application/dto/update-budget.dto';
import { BudgetsService } from '../../application/services/budgets.service';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance/budgets')
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUserPayload) {
    return this.service.findAllForUser(user.sub);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.findOneForUser(user.sub, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateBudgetDto) {
    return this.service.create(dto, user.sub);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUserPayload, @Param('id') id: string, @Body() dto: UpdateBudgetDto) {
    return this.service.update(id, dto, user.sub);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.remove(id, user.sub);
  }
}
