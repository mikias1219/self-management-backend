import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { LearningItemStatus } from '../../domain/enums/learning.enums';

export class CreateCourseDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ enum: LearningItemStatus })
  @IsOptional()
  @IsEnum(LearningItemStatus)
  learningStatus?: LearningItemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  progress?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  hoursSpent?: number;
}