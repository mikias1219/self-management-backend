import { PartialType } from '@nestjs/mapped-types';
import { CreateSpiritualActivityDto } from './create-spiritual-activity.dto';

export class UpdateSpiritualActivityDto extends PartialType(CreateSpiritualActivityDto) {}
