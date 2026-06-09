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
import { CreateTransactionDto } from '../../application/dto/create-transaction.dto';
import { CreateTransactionSimpleDto } from '../../application/dto/create-transaction-simple.dto';
import { UpdateTransactionDto } from '../../application/dto/update-transaction.dto';
import { TransactionsService } from '../../application/services/transactions.service';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance/transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.service.findAllForUserInPeriod(user.sub, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.findOneForUser(user.sub, id);
  }

  @Post('simple')
  createSimple(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: CreateTransactionSimpleDto,
  ) {
    return this.service.createSimple(user.sub, dto);
  }

  @Post()
  create(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateTransactionDto) {
    return this.service.create(dto, user.sub);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUserPayload, @Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.service.update(id, dto, user.sub);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.remove(id, user.sub);
  }
}
