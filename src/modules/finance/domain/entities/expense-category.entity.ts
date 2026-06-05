import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { ExpenseClassificationType } from '../enums/finance.enums';
import { FinanceTransaction } from './transaction.entity';

@Entity('finance_expense_categories')
@Index(['createdBy'])
export class ExpenseCategory extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  icon?: string;

  @Column({ nullable: true })
  color?: string;

  @Column({
    type: 'enum',
    enum: ExpenseClassificationType,
    default: ExpenseClassificationType.DISCRETIONARY,
  })
  classificationType: ExpenseClassificationType;

  /** For FIXED_OBLIGATION categories: day of month payment is due. */
  @Column({ type: 'int', nullable: true })
  dueDay?: number;

  /** For FIXED_OBLIGATION categories: expected monthly amount. */
  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  expectedAmount?: number;

  @OneToMany(() => FinanceTransaction, (tx) => tx.expenseCategory)
  transactions?: FinanceTransaction[];
}
