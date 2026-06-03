import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';

@Entity('finance_budgets')
@Index(['createdBy'])
export class FinanceBudget extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  spent: number;

  @Column({ type: 'date' })
  periodStart: string;

  @Column({ type: 'date' })
  periodEnd: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId?: string;
}
