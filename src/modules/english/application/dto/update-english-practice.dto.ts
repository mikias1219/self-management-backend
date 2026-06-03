import { PartialType } from '@nestjs/mapped-types';
import { CreateEnglishPracticeDto } from './create-english-practice.dto';

export class UpdateEnglishPracticeDto extends PartialType(CreateEnglishPracticeDto) {}
