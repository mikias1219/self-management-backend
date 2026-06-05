import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';

@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column()
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  displayName: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ default: 'UTC' })
  timezone: string;

  @Column({ default: 'ETB' })
  primaryCurrency: string;

  @Column({ type: 'text', nullable: true })
  about?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  focusAreas?: string[] | null;
}
