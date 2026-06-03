import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';

@Entity('notifications')
@Index(['createdBy', 'readAt'])
export class Notification extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  readAt?: Date;

  @Column({ nullable: true })
  link?: string;
}
