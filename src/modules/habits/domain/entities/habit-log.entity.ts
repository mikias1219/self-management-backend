import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { Habit } from './habit.entity';

@Entity('habit_logs')
@Index(['habitId', 'completedAt'])
export class HabitLog extends BaseEntity {
  @Column({ type: 'uuid' })
  habitId: string;

  @ManyToOne(() => Habit, (habit) => habit.logs, { onDelete: 'CASCADE' })
  habit: Habit;

  @Column({ type: 'timestamptz' })
  completedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
