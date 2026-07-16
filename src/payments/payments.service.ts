import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Payment, PaymentType } from './entities/payment.entity';
import { Loan, LoanStatus } from '../loans/entities/loan.entity';
import { AmortizationSchedule, ScheduleStatus } from '../loans/entities/amortization-schedule.entity';
import { LoansService } from '../loans/loans.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Loan)
    private loansRepository: Repository<Loan>,
    @InjectRepository(AmortizationSchedule)
    private scheduleRepository: Repository<AmortizationSchedule>,
    private loansService: LoansService,
    private dataSource: DataSource,
  ) {}

  async create(createPaymentDto: any, userId: string): Promise<Payment> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const findOptions: any = { where: { id: createPaymentDto.loanId } };
      if (queryRunner.connection.options.type !== 'sqlite') {
        findOptions.lock = { mode: 'pessimistic_write' };
      }
      const loan = await queryRunner.manager.findOne(Loan, findOptions);

      if (!loan) {
        throw new NotFoundException(`Loan with ID ${createPaymentDto.loanId} not found`);
      }

      if (loan.status !== LoanStatus.DISBURSED && loan.status !== LoanStatus.IN_MORA) {
        throw new BadRequestException('Payment can only be made for active loans');
      }

      const schedules = await queryRunner.manager.find(AmortizationSchedule, {
        where: { loanId: createPaymentDto.loanId },
        order: { installmentNumber: 'ASC' },
      });

      let remainingAmount = createPaymentDto.amount;
      let lateInterestApplied = 0;
      let interestApplied = 0;
      let principalApplied = 0;

      const lateInterest = await this.loansService.calculateLateInterest(createPaymentDto.loanId);

      if (lateInterest > 0) {
        const lateInterestPayment = Math.min(remainingAmount, lateInterest);
        lateInterestApplied = lateInterestPayment;
        remainingAmount -= lateInterestPayment;
      }

      for (const schedule of schedules) {
        if (remainingAmount <= 0) break;

        if (schedule.status === ScheduleStatus.PENDING || schedule.status === ScheduleStatus.OVERDUE) {
          const outstandingInterest = schedule.outstandingInterest;
          const outstandingPrincipal = schedule.outstandingPrincipal;

          if (outstandingInterest > 0 && remainingAmount > 0) {
            const interestPayment = Math.min(remainingAmount, outstandingInterest);
            interestApplied += interestPayment;
            schedule.outstandingInterest -= interestPayment;
            remainingAmount -= interestPayment;
          }

          if (outstandingPrincipal > 0 && remainingAmount > 0) {
            const principalPayment = Math.min(remainingAmount, outstandingPrincipal);
            principalApplied += principalPayment;
            schedule.outstandingPrincipal -= principalPayment;
            remainingAmount -= principalPayment;

            if (schedule.outstandingPrincipal <= 0.01 && schedule.outstandingInterest <= 0.01) {
              schedule.status = ScheduleStatus.PAID;
              schedule.paidDate = new Date();
            }
          }

          await queryRunner.manager.save(schedule);
        }
      }

      if (remainingAmount > 0 && principalApplied > 0) {
        for (const schedule of schedules) {
          if (remainingAmount <= 0) break;

          if (schedule.status === ScheduleStatus.PAID) {
            const extraPrincipalPayment = Math.min(remainingAmount, schedule.paymentAmount);
            principalApplied += extraPrincipalPayment;
            remainingAmount -= extraPrincipalPayment;
          }
        }
      }

      loan.outstandingPrincipal -= principalApplied;
      loan.outstandingInterest -= interestApplied;
      loan.lateInterest -= lateInterestApplied;

      if (loan.outstandingPrincipal <= 0.01) {
        loan.status = LoanStatus.LIQUIDATED;
        loan.liquidationDate = new Date();
      }

      await queryRunner.manager.save(loan);

      const payment = queryRunner.manager.create(Payment, {
        loanId: createPaymentDto.loanId,
        amount: createPaymentDto.amount,
        paymentType: this.determinePaymentType(loan, createPaymentDto.amount),
        principalApplied,
        interestApplied,
        lateInterestApplied,
        paymentDate: createPaymentDto.paymentDate || new Date(),
        receivedBy: userId,
        notes: createPaymentDto.notes,
      });

      const savedPayment = await queryRunner.manager.save(payment);

      await queryRunner.commitTransaction();
      return Array.isArray(savedPayment) ? savedPayment[0] : savedPayment;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  determinePaymentType(loan: Loan, amount: number): PaymentType {
    if (loan.outstandingPrincipal + loan.outstandingInterest + loan.lateInterest <= amount + 0.01) {
      return PaymentType.FULL;
    }
    if (loan.outstandingPrincipal <= amount + 0.01) {
      return PaymentType.EARLY_SETTLEMENT;
    }
    return PaymentType.PARTIAL;
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentsRepository.find({
      relations: ['loan'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['loan'],
    });
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return payment;
  }

  async findByLoan(loanId: string): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { loanId },
      relations: ['loan'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAccountStatus(loanId: string): Promise<any> {
    const loan = await this.loansService.findOne(loanId);
    const schedules = await this.scheduleRepository.find({
      where: { loanId },
      order: { installmentNumber: 'ASC' },
    });

    const nextPayment = schedules.find(s => s.status === ScheduleStatus.PENDING || s.status === ScheduleStatus.OVERDUE);
    const paidInstallments = schedules.filter(s => s.status === ScheduleStatus.PAID).length;
    const pendingInstallments = schedules.filter(s => s.status === ScheduleStatus.PENDING || s.status === ScheduleStatus.OVERDUE).length;

    return {
      loanId: loan.id,
      clientId: loan.clientId,
      status: loan.status,
      outstandingPrincipal: loan.outstandingPrincipal,
      outstandingInterest: loan.outstandingInterest,
      lateInterest: loan.lateInterest,
      totalOutstanding: loan.outstandingPrincipal + loan.outstandingInterest + loan.lateInterest,
      nextPayment: nextPayment ? {
        installmentNumber: nextPayment.installmentNumber,
        dueDate: nextPayment.dueDate,
        amount: nextPayment.paymentAmount,
      } : null,
      paidInstallments,
      pendingInstallments,
      totalInstallments: loan.termMonths,
      daysOverdue: loan.daysOverdue,
    };
  }
}
