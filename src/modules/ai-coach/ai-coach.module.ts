import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiCoachService } from './application/services/ai-coach.service';
import { AiCoachSession } from './domain/entities/ai-coach-session.entity';
import { AiCoachController } from './presentation/controllers/ai-coach.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AiCoachSession])],
  controllers: [AiCoachController],
  providers: [AiCoachService],
  exports: [AiCoachService],
})
export class AiCoachModule {}
