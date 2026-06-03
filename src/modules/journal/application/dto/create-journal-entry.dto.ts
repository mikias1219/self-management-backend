import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { JournalEntryType } from '../../domain/enums/journal.enums';

export class CreateJournalEntryDto {
  @ApiProperty({ enum: JournalEntryType })
  @IsEnum(JournalEntryType)
  entryType: JournalEntryType;

  @ApiProperty()
  @IsDateString()
  entryDate: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
