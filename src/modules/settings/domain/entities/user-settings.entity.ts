import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import type { UserIntegrations } from '../types/user-integrations.type';

@Entity('user_settings')
@Index(['createdBy'], { unique: true })
export class UserSettings extends BaseEntity {
  @Column({ default: 'UTC' })
  timezone: string;

  @Column({ default: 'en' })
  locale: string;

  @Column({ default: 'system' })
  theme: string;

  @Column({ type: 'jsonb', nullable: true })
  dashboardLayout?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  notificationPreferences?: Record<string, boolean>;

  @Column({ type: 'jsonb', nullable: true })
  modulePreferences?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  integrations?: UserIntegrations;

  /**
   * Day-of-month when salary typically arrives (1-28/29/30/31).
   * Finance cycles are anchored to this day.
   */
  @Column({ type: 'int', default: 25 })
  salaryDay: number;
}
