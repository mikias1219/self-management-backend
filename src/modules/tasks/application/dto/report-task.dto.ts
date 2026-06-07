import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ReportTaskDto {
  @ApiProperty({
    example: 120,
    description: 'Actual minutes spent (e.g. 120 for 2 hours)',
  })
  @IsInt()
  @Min(0)
  @Max(24 * 60)
  timeSpentMinutes: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'What was actually achieved' })
  @IsOptional()
  @IsString()
  completionNote?: string;
}
