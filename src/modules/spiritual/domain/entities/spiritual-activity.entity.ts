import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { SpiritualActivityType } from '../enums/spiritual.enums';

@Entity('spiritual_activities')
@Index(['createdBy', 'activityDate'])
export class SpiritualActivity extends BaseEntity {
  @Column({ type: 'enum', enum: SpiritualActivityType })
  activityType: SpiritualActivityType;

  @Column({ type: 'date' })
  activityDate: string;

  @Column({ type: 'int', nullable: true })
  durationMinutes?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
