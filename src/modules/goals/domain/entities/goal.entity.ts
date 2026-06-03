import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { GoalLevel } from '../enums/goal.enums';

@Entity('goals')
@Index(['createdBy', 'level'])
@Index(['parentId'])
export class Goal extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: GoalLevel })
  level: GoalLevel;

  @Column({ type: 'uuid', nullable: true })
  parentId?: string;

  @ManyToOne(() => Goal, (goal) => goal.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent?: Goal;

  @OneToMany(() => Goal, (goal) => goal.parent)
  children?: Goal[];

  @Column({ type: 'date', nullable: true })
  targetDate?: string;

  @Column({ type: 'float', default: 0 })
  progress: number;

  @Column({ type: 'varchar', nullable: true })
  category?: string;
}
