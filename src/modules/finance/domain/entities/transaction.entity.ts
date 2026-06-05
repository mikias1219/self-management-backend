import { Column, Entity, Index } from 'typeorm';
import { IncomeSource } from '../../../../common/domain/enums/income-source.enum';
import { PaymentMethod } from '../../../../common/domain/enums/payment-method.enum';
import { RecurringInterval } from '../../../../common/domain/enums/recurring-interval.enum';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { TransactionType } from '../enums/finance.enums';

@Entity('finance_transactions')
@Index(['createdBy', 'transactionDate'])
@Index(['accountId'])
@Index(['linkedTaskId'])
export class FinanceTransaction extends BaseEntity {
  @Column({ type: 'uuid' })
  accountId: string;

  @Column({ type: 'enum', enum: TransactionType })
  transactionType: TransactionType;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 8, default: 'ETB' })
  currency: string;

  @Column({ type: 'date' })
  transactionDate: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId?: string;

  @Column({ type: 'enum', enum: IncomeSource, nullable: true })
  incomeSource?: IncomeSource;

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod?: PaymentMethod;

  @Column({ default: false })
  isRecurring: boolean;

  @Column({
    type: 'enum',
    enum: RecurringInterval,
    default: RecurringInterval.NONE,
  })
  recurringInterval: RecurringInterval;

  @Column({ type: 'uuid', nullable: true })
  linkedTaskId?: string;
}
