import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { AnalyticsPeriod } from '../domain/enums/period.enum';

export class DateRangeQueryDto {
  @IsOptional()
  @IsEnum(AnalyticsPeriod)
  period?: AnalyticsPeriod;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
