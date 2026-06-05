import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';
import { AccountType } from '../enums/finance.enums';

@Entity('finance_accounts')
@Index(['createdBy'])
export class FinanceAccount extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'enum', enum: AccountType })
  accountType: AccountType;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  balance: number;

  @Column({ default: 'ETB' })
  currency: string;
}
