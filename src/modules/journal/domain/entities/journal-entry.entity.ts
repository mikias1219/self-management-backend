import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { JournalEntryType } from '../enums/journal.enums';

@Entity('journal_entries')
@Index(['createdBy', 'entryDate'])
export class JournalEntry extends BaseEntity {
  @Column({ type: 'enum', enum: JournalEntryType })
  entryType: JournalEntryType;

  @Column({ type: 'date' })
  entryDate: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];
}
