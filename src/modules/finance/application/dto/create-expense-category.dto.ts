import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
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
}