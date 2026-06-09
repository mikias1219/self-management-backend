import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';

@Entity('daily_reviews')
@Index(['createdBy', 'reviewDate'], { unique: true })
export class DailyReview extends BaseEntity {
  @Column({ type: 'date' })
  reviewDate: string;

  @Column({ type: 'text', nullable: true })
  wins?: string;

  @Column({ type: 'text', nullable: true })
  challenges?: string;

  @Column({ type: 'text', nullable: true })
  lessons?: string;

  @Column({ type: 'text', nullable: true })
  tomorrowFocus?: string;

  @Column({ type: 'int', nullable: true })
  moodScore?: number;

  @Column({ type: 'int', nullable: true })
  productivityScore?: number;

  @Column({ type: 'varchar', length: 20, default: 'daily' })
  reviewType: string;
}
