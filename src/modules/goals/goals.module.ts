import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationsModule } from '../integrations/integrations.module';
import { GoalsService } from './application/services/goals.service';
import { Task } from '../tasks/domain/entities/task.entity';
import { Goal } from './domain/entities/goal.entity';
import { GoalsController } from './presentation/controllers/goals.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Goal, Task]), IntegrationsModule],
  controllers: [GoalsController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
