import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';

@Entity('ai_coach_sessions')
@Index(['createdBy'])
export class AiCoachSession extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  context?: string;

  @Column({ type: 'jsonb', nullable: true })
  messages?: Array<{ role: string; content: string; createdAt: string }>;

  @Column({ default: false })
  isArchived: boolean;
}
