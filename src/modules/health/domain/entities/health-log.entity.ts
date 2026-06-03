import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { HealthMetricType } from '../enums/health.enums';

@Entity('health_logs')
@Index(['createdBy', 'logDate', 'metricType'])
export class HealthLog extends BaseEntity {
  @Column({ type: 'enum', enum: HealthMetricType })
  metricType: HealthMetricType;

  @Column({ type: 'date' })
  logDate: string;

  @Column({ type: 'float' })
  value: number;

  @Column({ nullable: true })
  unit?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
