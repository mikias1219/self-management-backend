import { PartialType } from '@nestjs/mapped-types';
import { CreateAiCoachSessionDto } from './create-ai-coach-session.dto';

export class UpdateAiCoachSessionDto extends PartialType(CreateAiCoachSessionDto) {}
