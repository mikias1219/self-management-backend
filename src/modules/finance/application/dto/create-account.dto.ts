import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { AccountType } from '../../domain/enums/finance.enums';

export class CreateAccountDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: AccountType })
  @IsEnum(AccountType)
  accountType: AccountType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  balance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;
}