import { PartialType } from '@nestjs/mapped-types';
import { CreateLearningProjectDto } from './create-learning-project.dto';
export class UpdateLearningProjectDto extends PartialType(CreateLearningProjectDto) {}
