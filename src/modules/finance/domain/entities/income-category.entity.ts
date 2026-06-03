import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';

@Entity('finance_income_categories')
@Index(['createdBy'])
export class IncomeCategory extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  icon?: string;

  @Column({ nullable: true })
  color?: string;
}
