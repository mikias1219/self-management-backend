import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { FinanceTransaction } from './transaction.entity';

@Entity('finance_savings_goals')
@Index(['createdBy'])
export class SavingsGoal extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  targetAmount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  currentAmount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  monthlyTargetAmount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  savingsShortfallCarryForward: number;

  @Column({ type: 'date', nullable: true })
  targetDate?: string;

  @OneToMany(() => FinanceTransaction, (tx) => tx.savingsGoal)
  transactions?: FinanceTransaction[];
}
