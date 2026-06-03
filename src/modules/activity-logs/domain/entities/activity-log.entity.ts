import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import {
  ActivityAction,
  ActivityModule,
} from '../../../../common/domain/enums/activity-action.enum';

@Entity('activity_logs')
@Index(['userId', 'createdAt'])
@Index(['module', 'action'])
export class ActivityLog extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: ActivityModule })
  module: ActivityModule;

  @Column({ type: 'enum', enum: ActivityAction })
  action: ActivityAction;

  @Column()
  entityType: string;

  @Column({ type: 'uuid', nullable: true })
  entityId?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;
}
