import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ExpenseClassificationType } from '../../domain/enums/finance.enums';

export class CreateExpenseCategoryDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ enum: ExpenseClassificationType })
  @IsOptional()
  @IsEnum(ExpenseClassificationType)
  classificationType?: ExpenseClassificationType;

  @ApiPropertyOptional({ description: 'Due day for fixed obligations (1-31)' })
  @IsOptional()
  @IsNumber()
  dueDay?: number;

  @ApiPropertyOptional({ description: 'Expected monthly amount for fixed obligations' })
  @IsOptional()
  @IsNumber()
  expectedAmount?: number;
}