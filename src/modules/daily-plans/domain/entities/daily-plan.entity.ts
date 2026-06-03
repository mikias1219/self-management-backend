import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { PlanModule } from '../enums/plan-module.enum';
import { PlanStatus } from '../enums/plan-status.enum';

@Entity('daily_plans')
@Index(['createdBy', 'planDate'])
@Index(['createdBy', 'planStatus'])
export class DailyPlan extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: 'enum', enum: PlanModule, default: PlanModule.OTHER })
  module: PlanModule;

  @Column({ type: 'date' })
  planDate: string;

  @Column({ type: 'int' })
  plannedMinutes: number;

  @Column({ type: 'int', default: 0 })
  achievedMinutes: number;

  @Column({ type: 'enum', enum: PlanStatus, default: PlanStatus.PLANNED })
  planStatus: PlanStatus;

  @Column({ type: 'timestamptz', nullable: true })
  reportedAt?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
