import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { TaskPriority, TaskStatus } from '../enums/task.enums';

@Entity('tasks')
@Index(['createdBy', 'dueDate'])
@Index(['status'])
export class Task extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
  taskStatus: TaskStatus;

  @Column({ nullable: true })
  category?: string;

  @Column({ type: 'timestamptz', nullable: true })
  dueDate?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @Column({ type: 'int', nullable: true })
  estimatedMinutes?: number;

  @Column({ type: 'int', default: 0 })
  timeSpentMinutes: number;

  @Column({ type: 'uuid', nullable: true })
  goalId?: string;
}
