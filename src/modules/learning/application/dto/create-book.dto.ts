import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { LearningItemStatus } from '../../domain/enums/learning.enums';

export class CreateBookDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({ enum: LearningItemStatus })
  @IsOptional()
  @IsEnum(LearningItemStatus)
  learningStatus?: LearningItemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  pagesRead?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  totalPages?: number;
}