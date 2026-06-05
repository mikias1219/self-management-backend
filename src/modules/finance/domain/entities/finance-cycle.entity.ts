import { Column, Entity, Index } from 'typeorm';
import { AuditableEntity } from '../../../../common/domain/auditable.entity';
import { FinanceCycleStatus } from '../enums/finance.enums';

@Entity('finance_cycles')
@Index(['createdBy', 'startDate'])
@Index(['createdBy', 'cycleStatus'])
export class FinanceCycle extends AuditableEntity {
  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'enum', enum: FinanceCycleStatus, default: FinanceCycleStatus.OPEN })
  cycleStatus: FinanceCycleStatus;

  // Salary amounts captured at cycle start (salary arrival)
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  grossSalary: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  netSalary: number;

  /** Planned allocation buckets (must sum to netSalary). */
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  fixedObligations: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  savingsTarget: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  spendingBudget: number;

  /** Running totals within the cycle. */
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalFixedObligations: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalSavingsAllocated: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalVariableSpent: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  remainingBalance: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  savingsShortfall: number;

  // Permanent metrics stored on close
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  actualSavingsRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  fixedObligationRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discretionaryRate: number;

  @Column({ nullable: true })
  largestExpenseCategory?: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  unspentBudget: number;

  @Column({ type: 'int', default: 0 })
  financialHealthScore: number;

  // Close metadata
  @Column({ type: 'timestamptz', nullable: true })
  closedAt?: Date | null;
}

