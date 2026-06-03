import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { TransactionType } from '../enums/finance.enums';

@Entity('finance_transactions')
@Index(['createdBy', 'transactionDate'])
@Index(['accountId'])
export class FinanceTransaction extends BaseEntity {
  @Column({ type: 'uuid' })
  accountId: string;

  @Column({ type: 'enum', enum: TransactionType })
  transactionType: TransactionType;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  transactionDate: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId?: string;
}
