import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SpiritualActivityType } from '../../domain/enums/spiritual.enums';

export class CreateSpiritualActivityDto {
  @ApiProperty({ enum: SpiritualActivityType })
  @IsEnum(SpiritualActivityType)
  activityType: SpiritualActivityType;

  @ApiProperty()
  @IsDateString()
  activityDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
