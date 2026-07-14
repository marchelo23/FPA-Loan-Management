import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Loan } from './loan.entity';

export enum ScheduleStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
}

@Entity('amortization_schedules')
export class AmortizationSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Loan, (loan) => loan.amortizationSchedule)
  loan: Loan;

  @Column()
  loanId: string;

  @Column({ type: 'int' })
  installmentNumber: number;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  paymentAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  principalAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  interestAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  outstandingPrincipal: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  outstandingInterest: number;

  @Column({
    type: 'enum',
    enum: ScheduleStatus,
    default: ScheduleStatus.PENDING,
  })
  status: ScheduleStatus;

  @Column({ type: 'date', nullable: true })
  paidDate: Date;

  @Column({ type: 'int', default: 0 })
  daysOverdue: number;

  @CreateDateColumn()
  createdAt: Date;
}
