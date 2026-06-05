import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Goal } from '../goals/domain/entities/goal.entity';
import { IntegrationsModule } from '../integrations/integrations.module';
import { TasksService } from './application/services/tasks.service';
import { Task } from './domain/entities/task.entity';
import { TasksController } from './presentation/controllers/tasks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Goal]), IntegrationsModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
