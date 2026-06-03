import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { PlanModule } from '../../domain/enums/plan-module.enum';

export class CreateDailyPlanDto {
  @ApiProperty({ example: 'Read Bible' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ enum: PlanModule, example: PlanModule.SPIRITUAL })
  @IsEnum(PlanModule)
  module: PlanModule;

  @ApiProperty({ example: '2026-06-03' })
  @IsDateString()
  planDate: string;

  @ApiProperty({ example: 120, description: 'Planned duration in minutes' })
  @IsInt()
  @Min(1)
  @Max(24 * 60)
  plannedMinutes: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
