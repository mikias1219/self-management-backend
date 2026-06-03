import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { LearningItemStatus } from '../enums/learning.enums';

@Entity('learning_projects')
@Index(['createdBy'])
export class LearningProject extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: LearningItemStatus, default: LearningItemStatus.NOT_STARTED })
  learningStatus: LearningItemStatus;

  @Column({ type: 'float', default: 0 })
  progress: number;
}
