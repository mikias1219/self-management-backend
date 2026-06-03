import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { LearningItemStatus } from '../../domain/enums/learning.enums';

export class CreateLearningProjectDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: LearningItemStatus })
  @IsOptional()
  @IsEnum(LearningItemStatus)
  learningStatus?: LearningItemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  progress?: number;
}