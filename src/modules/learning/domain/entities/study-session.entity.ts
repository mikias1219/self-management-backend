import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';

@Entity('learning_study_sessions')
@Index(['createdBy', 'sessionDate'])
export class StudySession extends BaseEntity {
  @Column({ type: 'date' })
  sessionDate: string;

  @Column({ type: 'int' })
  durationMinutes: number;

  @Column({ nullable: true })
  topic?: string;

  @Column({ type: 'uuid', nullable: true })
  skillId?: string;

  @Column({ type: 'uuid', nullable: true })
  courseId?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
