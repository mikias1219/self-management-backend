import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { HealthMetricType } from '../../domain/enums/health.enums';

export class CreateHealthLogDto {
  @ApiProperty({ enum: HealthMetricType })
  @IsEnum(HealthMetricType)
  metricType: HealthMetricType;

  @ApiProperty()
  @IsDateString()
  logDate: string;

  @ApiProperty()
  @IsNumber()
  value: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
