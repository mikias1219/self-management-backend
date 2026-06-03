import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { EnglishPracticeType } from '../../domain/enums/english.enums';

export class CreateEnglishPracticeDto {
  @ApiProperty({ enum: EnglishPracticeType })
  @IsEnum(EnglishPracticeType)
  practiceType: EnglishPracticeType;

  @ApiProperty()
  @IsDateString()
  practiceDate: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  durationMinutes: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  score?: number;
}
