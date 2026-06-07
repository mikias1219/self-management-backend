import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { IncomeSource } from '../../../../common/domain/enums/income-source.enum';
import { PaymentMethod } from '../../../../common/domain/enums/payment-method.enum';
import { RecurringInterval } from '../../../../common/domain/enums/recurring-interval.enum';
import { TransactionType } from '../../domain/enums/finance.enums';

export class CreateTransactionDto {
  @ApiProperty()
  @IsUUID()
  accountId: string;

  @ApiPropertyOptional({
    description: 'Destination account for transfers.',
  })
  @IsOptional()
  @IsUUID()
  toAccountId?: string;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Gross salary (income + salary source)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  grossAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  taxDeducted?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pensionDeducted?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  netAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needsReview?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCorrection?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  correctionReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  pendingObligationId?: string;

  @ApiPropertyOptional({ default: 'ETB' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @ApiProperty()
  @IsDateString()
  transactionDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: IncomeSource })
  @IsOptional()
  @IsEnum(IncomeSource)
  incomeSource?: IncomeSource;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ enum: RecurringInterval })
  @IsOptional()
  @IsEnum(RecurringInterval)
  recurringInterval?: RecurringInterval;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  linkedTaskId?: string;

  @ApiPropertyOptional({
    description:
      'Link a transfer transaction to a savings goal (savings transfer).',
  })
  @IsOptional()
  @IsUUID()
  savingsGoalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isWastage?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPartialPayment?: boolean;
}