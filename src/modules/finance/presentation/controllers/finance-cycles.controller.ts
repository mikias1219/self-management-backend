import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthUserPayload,
  CurrentUser,
} from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { UpdateCycleAllocationDto } from '../../application/dto/update-cycle-allocation.dto';
import { FinanceCyclesService } from '../../application/services/finance-cycles.service';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance/cycles')
export class FinanceCyclesController {
  constructor(private readonly service: FinanceCyclesService) {}

  @Get()
  list(@CurrentUser() user: AuthUserPayload) {
    return this.service.listForUser(user.sub);
  }

  @Get('current')
  getCurrent(@CurrentUser() user: AuthUserPayload) {
    return this.service.getCurrent(user.sub);
  }

  @Patch('current/allocation')
  updateAllocation(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: UpdateCycleAllocationDto,
  ) {
    return this.service.updateAllocation(user.sub, dto);
  }
}
