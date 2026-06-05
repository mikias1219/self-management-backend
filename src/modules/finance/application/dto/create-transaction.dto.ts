import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @ApiProperty()
  @IsNumber()
  amount: number;

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
}