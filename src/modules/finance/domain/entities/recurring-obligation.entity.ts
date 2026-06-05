import { Column, Entity, Index } from 'typeorm';
import { PaymentMethod } from '../../../../common/domain/enums/payment-method.enum';
import { BaseEntity } from '../../../../common/domain/base.entity';

@Entity('finance_recurring_obligations')
@Index(['createdBy', 'isActive'])
export class RecurringObligation extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'int' })
  dueDayOfMonth: number;

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod?: PaymentMethod;

  @Column({ nullable: true })
  landlordReference?: string;

  @Column({ default: true })
  isActive: boolean;
}
