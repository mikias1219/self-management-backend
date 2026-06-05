import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthUserPayload,
  CurrentUser,
} from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { MarkObligationPaidDto } from '../../application/dto/mark-obligation-paid.dto';
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

  @Patch('obligations/:obligationId/pay')
  markObligationPaid(
    @CurrentUser() user: AuthUserPayload,
    @Param('obligationId') obligationId: string,
    @Body() dto: MarkObligationPaidDto,
  ) {
    return this.service.markObligationPaid(
      user.sub,
      obligationId,
      dto.transactionId,
    );
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.getOneForUser(user.sub, id);
  }
}
