import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateHabitLogDto {
  @ApiProperty()
  @IsDateString()
  completedAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
