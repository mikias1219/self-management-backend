import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationsModule } from '../integrations/integrations.module';
import { GoalsService } from './application/services/goals.service';
import { Goal } from './domain/entities/goal.entity';
import { GoalsController } from './presentation/controllers/goals.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Goal]), IntegrationsModule],
  controllers: [GoalsController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
