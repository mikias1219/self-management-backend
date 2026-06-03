import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HabitsService } from './application/services/habits.service';
import { HabitLog } from './domain/entities/habit-log.entity';
import { Habit } from './domain/entities/habit.entity';
import { HabitLogsController } from './presentation/controllers/habit-logs.controller';
import { HabitsController } from './presentation/controllers/habits.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Habit, HabitLog])],
  controllers: [HabitsController, HabitLogsController],
  providers: [HabitsService],
  exports: [HabitsService],
})
export class HabitsModule {}
