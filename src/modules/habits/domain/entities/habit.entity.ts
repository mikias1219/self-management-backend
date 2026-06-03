import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { HabitFrequency } from '../enums/habit.enums';
import { HabitLog } from './habit-log.entity';

@Entity('habits')
@Index(['createdBy'])
export class Habit extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: HabitFrequency, default: HabitFrequency.DAILY })
  frequency: HabitFrequency;

  @Column({ nullable: true })
  category?: string;

  @Column({ type: 'int', default: 0 })
  currentStreak: number;

  @Column({ type: 'int', default: 0 })
  bestStreak: number;

  @Column({ type: 'varchar', nullable: true })
  color?: string;

  @OneToMany(() => HabitLog, (log) => log.habit)
  logs?: HabitLog[];
}
