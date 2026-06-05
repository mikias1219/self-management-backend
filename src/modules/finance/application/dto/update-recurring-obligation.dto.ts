import { PartialType } from '@nestjs/mapped-types';
import { CreateRecurringObligationDto } from './create-recurring-obligation.dto';

export class UpdateRecurringObligationDto extends PartialType(
  CreateRecurringObligationDto,
) {}
