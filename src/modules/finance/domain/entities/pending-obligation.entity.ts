import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { PendingObligationStatus } from '../enums/finance.enums';

@Entity('finance_pending_obligations')
@Index(['createdBy', 'cycleId'])
@Index(['createdBy', 'status'])
export class PendingObligation extends BaseEntity {
  @Column({ type: 'uuid' })
  cycleId: string;

  @Column({ type: 'uuid', nullable: true })
  recurringObligationId?: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId?: string;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  expectedAmount: number;

  @Column({ type: 'date' })
  dueDate: string;

  @Column({
    type: 'enum',
    enum: PendingObligationStatus,
    default: PendingObligationStatus.PENDING,
  })
  obligationStatus: PendingObligationStatus;

  @Column({ type: 'uuid', nullable: true })
  paidTransactionId?: string;
}
