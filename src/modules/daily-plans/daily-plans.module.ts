import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyPlansService } from './application/services/daily-plans.service';
import { DailyPlan } from './domain/entities/daily-plan.entity';
import { DailyPlansController } from './presentation/controllers/daily-plans.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DailyPlan])],
  controllers: [DailyPlansController],
  providers: [DailyPlansService],
  exports: [DailyPlansService],
})
export class DailyPlansModule {}
