import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { LearningItemStatus } from '../enums/learning.enums';

@Entity('learning_books')
@Index(['createdBy'])
export class Book extends BaseEntity {
  @Column()
  title: string;

  @Column({ nullable: true })
  author?: string;

  @Column({ type: 'enum', enum: LearningItemStatus, default: LearningItemStatus.NOT_STARTED })
  learningStatus: LearningItemStatus;

  @Column({ type: 'int', default: 0 })
  pagesRead: number;

  @Column({ type: 'int', nullable: true })
  totalPages?: number;
}
