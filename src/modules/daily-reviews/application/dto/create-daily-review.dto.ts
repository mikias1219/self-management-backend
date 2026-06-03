import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateDailyReviewDto {
  @ApiProperty()
  @IsDateString()
  reviewDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wins?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  challenges?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lessons?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tomorrowFocus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  moodScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  productivityScore?: number;
}
