import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class UpdateCycleAllocationDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fixedObligations: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  savingsTarget: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  spendingBudget: number;
}
