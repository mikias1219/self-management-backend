import { PartialType } from '@nestjs/mapped-types';
import { CreateHealthLogDto } from './create-health-log.dto';

export class UpdateHealthLogDto extends PartialType(CreateHealthLogDto) {}
