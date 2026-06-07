import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { LifeArea } from '../../../../common/domain/enums/life-area.enum';
import { TaskStatus } from '../../domain/enums/task.enums';

export class TaskQueryDto {
  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  taskStatus?: TaskStatus;

  @ApiPropertyOptional({ enum: LifeArea })
  @IsOptional()
  @IsEnum(LifeArea)
  lifeArea?: LifeArea;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completedFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completedTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledTo?: string;

  @ApiPropertyOptional({ description: 'Filter by parent task id' })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  @ApiPropertyOptional({
    description: 'When true, only top-level tasks (no parent)',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  topLevelOnly?: boolean;

  @ApiPropertyOptional({
    description: 'When true, only recurring template tasks',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  recurringOnly?: boolean;
}
