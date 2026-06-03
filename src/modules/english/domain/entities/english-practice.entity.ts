import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { EnglishPracticeType } from '../enums/english.enums';

@Entity('english_practices')
@Index(['createdBy', 'practiceDate'])
export class EnglishPractice extends BaseEntity {
  @Column({ type: 'enum', enum: EnglishPracticeType })
  practiceType: EnglishPracticeType;

  @Column({ type: 'date' })
  practiceDate: string;

  @Column({ type: 'int' })
  durationMinutes: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'int', nullable: true })
  score?: number;
}
