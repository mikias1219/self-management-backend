import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { FinanceAccount } from './account.entity';
import { IncomeSource } from '../../../../common/domain/enums/income-source.enum';
import { PaymentMethod } from '../../../../common/domain/enums/payment-method.enum';
import { RecurringInterval } from '../../../../common/domain/enums/recurring-interval.enum';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { TransactionType } from '../enums/finance.enums';
import { ExpenseCategory } from './expense-category.entity';
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

  /** Salary breakdown (income + incomeSource=salary). amount should equal netAmount. */
  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  grossAmount?: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  taxDeducted?: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  pensionDeducted?: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  netAmount?: number;

  @Column({ default: false })
  needsReview: boolean;

  @Column({ default: false })
  isCorrection: boolean;

  @Column({ nullable: true })
  correctionReason?: string;

  @Column({ type: 'uuid', nullable: true })
  cycleId?: string;

  @Column({ type: 'uuid', nullable: true })
  pendingObligationId?: string;

  @Column({ type: 'varchar', length: 8, default: 'ETB' })
  currency: string;

  @Column({ type: 'date' })
  transactionDate: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId?: string;

  @ManyToOne(() => ExpenseCategory, (cat) => cat.transactions, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'categoryId' })
  expenseCategory?: ExpenseCategory;

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

  /** Destination account for TRANSFER transactions. */
  @Column({ type: 'uuid', nullable: true })
  toAccountId?: string;

  @Column({ type: 'uuid', nullable: true })
  savingsGoalId?: string;

  @ManyToOne(() => SavingsGoal, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'savingsGoalId' })
  savingsGoal?: SavingsGoal;
}
