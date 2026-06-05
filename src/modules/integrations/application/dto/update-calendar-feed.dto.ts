import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCalendarFeedDto {
  @ApiPropertyOptional({
    description: 'Private Google Calendar iCal URL (basic.ics)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  icalFeedUrl?: string;

  @ApiPropertyOptional({
    description: 'Embed src, e.g. mikiyasabate003@gmail.com',
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  embedSrc?: string;

  @ApiPropertyOptional({ example: 'Africa/Nairobi' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
