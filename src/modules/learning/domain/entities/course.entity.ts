import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { LearningItemStatus } from '../enums/learning.enums';

@Entity('learning_courses')
@Index(['createdBy'])
export class Course extends BaseEntity {
  @Column()
  title: string;

  @Column({ nullable: true })
  platform?: string;

  @Column({ type: 'enum', enum: LearningItemStatus, default: LearningItemStatus.NOT_STARTED })
  learningStatus: LearningItemStatus;

  @Column({ type: 'float', default: 0 })
  progress: number;

  @Column({ type: 'int', default: 0 })
  hoursSpent: number;
}
