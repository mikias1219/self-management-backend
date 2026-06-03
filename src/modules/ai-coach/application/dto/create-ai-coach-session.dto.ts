import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CoachMessageDto {
  @IsString()
  role: string;

  @IsString()
  content: string;

  @IsString()
  createdAt: string;
}

export class CreateAiCoachSessionDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({ type: [CoachMessageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoachMessageDto)
  messages?: CoachMessageDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
