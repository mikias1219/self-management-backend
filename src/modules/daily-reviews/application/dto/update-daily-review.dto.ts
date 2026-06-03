import { PartialType } from '@nestjs/mapped-types';
import { CreateDailyReviewDto } from './create-daily-review.dto';

export class UpdateDailyReviewDto extends PartialType(CreateDailyReviewDto) {}
