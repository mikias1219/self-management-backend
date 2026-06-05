import {
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class ConfirmActionDto {
  @IsString()
  sessionId: string;

  @IsString()
  tool: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsObject()
  args?: Record<string, unknown>;
}
