import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MarkObligationPaidDto {
  @ApiProperty()
  @IsUUID()
  transactionId: string;
}
