import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSavingsGoalDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  targetAmount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  currentAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}