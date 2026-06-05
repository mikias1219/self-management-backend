import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { ExpenseClassificationType } from '../enums/finance.enums';

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
}
