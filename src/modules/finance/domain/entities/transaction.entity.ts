import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { FinanceAccount } from './account.entity';
import { IncomeSource } from '../../../../common/domain/enums/income-source.enum';
import { PaymentMethod } from '../../../../common/domain/enums/payment-method.enum';
import { RecurringInterval } from '../../../../common/domain/enums/recurring-interval.enum';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { TransactionType } from '../enums/finance.enums';
import { SavingsGoal } from './savings-goal.entity';

@Entity('finance_transactions')
@Index(['createdBy', 'transactionDate'])
@Index(['accountId'])
@Index(['linkedTaskId'])
export class FinanceTransaction extends BaseEntity {
  @Column({ type: 'uuid' })
  accountId: string;

  @ManyToOne(() => FinanceAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account: FinanceAccount;

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

  @Column({ type: 'uuid', nullable: true })
  savingsGoalId?: string;

  @ManyToOne(() => SavingsGoal, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'savingsGoalId' })
  savingsGoal?: SavingsGoal;
}
