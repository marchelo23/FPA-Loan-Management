import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { AmortizationSchedule } from './amortization-schedule.entity';
import { Payment } from '../../payments/entities/payment.entity';

export enum LoanStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  DISBURSED = 'disbursed',
  IN_MORA = 'in_mora',
  LIQUIDATED = 'liquidated',
  REJECTED = 'rejected',
}

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Client, (client) => client.loans)
  client: Client;

  @Column()
  clientId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'int' })
  termMonths: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  annualInterestRate: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  monthlyPayment: number;

  @Column({
    type: 'enum',
    enum: LoanStatus,
    default: LoanStatus.REQUESTED,
  })
  status: LoanStatus;

  @Column({ type: 'date', nullable: true })
  approvalDate: Date;

  @Column({ type: 'date', nullable: true })
  disbursementDate: Date;

  @Column({ type: 'date', nullable: true })
  liquidationDate: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  outstandingPrincipal: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  outstandingInterest: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  lateInterest: number;

  @Column({ type: 'int', default: 0 })
  daysOverdue: number;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ nullable: true })
  rejectedReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => AmortizationSchedule, (schedule) => schedule.loan)
  amortizationSchedule: AmortizationSchedule[];

  @OneToMany(() => Payment, (payment) => payment.loan)
  payments: Payment[];
}
