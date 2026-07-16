import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Loan } from '../../loans/entities/loan.entity';

export enum PaymentType {
  PARTIAL = 'partial',
  FULL = 'full',
  EARLY_SETTLEMENT = 'early_settlement',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Loan, (loan) => loan.payments)
  loan: Loan;

  @Column()
  loanId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({
    type: 'varchar',
    enum: PaymentType,
    default: PaymentType.PARTIAL,
  })
  paymentType: PaymentType;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  principalApplied: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  interestApplied: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  lateInterestApplied: number;

  @Column({ type: 'date' })
  paymentDate: Date;

  @Column({ nullable: true })
  receivedBy: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
