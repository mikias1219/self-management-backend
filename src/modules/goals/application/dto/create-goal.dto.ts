import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { LifeArea } from '../../../../common/domain/enums/life-area.enum';
import { GoalLevel } from '../../domain/enums/goal.enums';

export class CreateGoalDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: GoalLevel })
  @IsEnum(GoalLevel)
  level: GoalLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  progress?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: LifeArea })
  @IsOptional()
  @IsEnum(LifeArea)
  lifeArea?: LifeArea;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  measurableTarget?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  syncToCalendar?: boolean;
}
