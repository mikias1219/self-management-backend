import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ReportDailyPlanDto {
  @ApiProperty({
    example: 120,
    description: 'Actual minutes completed (e.g. 120 for 2 hours)',
  })
  @IsInt()
  @Min(0)
  @Max(24 * 60)
  achievedMinutes: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
