import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { Loan, LoanStatus } from './entities/loan.entity';
import { AmortizationSchedule, ScheduleStatus } from './entities/amortization-schedule.entity';
import { ClientsService } from '../clients/clients.service';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private loansRepository: Repository<Loan>,
    @InjectRepository(AmortizationSchedule)
    private scheduleRepository: Repository<AmortizationSchedule>,
    private clientsService: ClientsService,
    private dataSource: DataSource,
  ) {}

  async create(createLoanDto: any, userId: string): Promise<Loan> {
    const client = await this.clientsService.findOne(createLoanDto.clientId);

    if (!client.isActive) {
      throw new BadRequestException('Client is not active');
    }

    if (createLoanDto.amount > client.creditLimit) {
      throw new BadRequestException('Loan amount exceeds client credit limit');
    }

    const activeLoan = await this.loansRepository.findOne({
      where: [
        { clientId: createLoanDto.clientId, status: LoanStatus.IN_MORA },
        { clientId: createLoanDto.clientId, status: LoanStatus.DISBURSED },
        { clientId: createLoanDto.clientId, status: LoanStatus.APPROVED },
      ],
    });

    if (activeLoan) {
      const statusMessages: Record<LoanStatus, string> = {
        [LoanStatus.IN_MORA]: 'in mora',
        [LoanStatus.DISBURSED]: 'active (disbursed)',
        [LoanStatus.APPROVED]: 'approved pending disbursement',
        [LoanStatus.REQUESTED]: 'requested',
        [LoanStatus.REJECTED]: 'rejected',
        [LoanStatus.LIQUIDATED]: 'liquidated',
      };
      throw new ConflictException(
        `Client has an ${statusMessages[activeLoan.status] || 'active'} loan. Cannot create new loan.`,
      );
    }

    const monthlyPayment = this.calculateMonthlyPayment(
      createLoanDto.amount,
      createLoanDto.annualInterestRate,
      createLoanDto.termMonths,
    );

    const loan = this.loansRepository.create({
      ...createLoanDto,
      monthlyPayment,
      status: LoanStatus.REQUESTED,
      outstandingPrincipal: createLoanDto.amount,
    });

    const savedLoan = await this.loansRepository.save(loan);
    return Array.isArray(savedLoan) ? savedLoan[0] : savedLoan;
  }

  calculateMonthlyPayment(principal: number, annualRate: number, months: number): number {
    const monthlyRate = annualRate / 100 / 12;
    if (monthlyRate === 0) {
      return principal / months;
    }
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    return Math.round(payment * 100) / 100;
  }

  simulateLoan(amount: number, annualInterestRate: number, termMonths: number) {
    const monthlyPayment = this.calculateMonthlyPayment(amount, annualInterestRate, termMonths);
    const monthlyRate = annualInterestRate / 100 / 12;
    const schedule = [];
    let balance = amount;

    for (let i = 1; i <= termMonths; i++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      balance -= principalPayment;

      schedule.push({
        installmentNumber: i,
        paymentAmount: Math.round(monthlyPayment * 100) / 100,
        principalAmount: Math.round(principalPayment * 100) / 100,
        interestAmount: Math.round(interestPayment * 100) / 100,
        balance: Math.round(Math.max(0, balance) * 100) / 100,
      });
    }

    return {
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalAmount: Math.round(monthlyPayment * termMonths * 100) / 100,
      totalInterest: Math.round((monthlyPayment * termMonths - amount) * 100) / 100,
      schedule,
    };
  }

  async findAll(): Promise<Loan[]> {
    return this.loansRepository.find({
      relations: ['client', 'amortizationSchedule'],
    });
  }

  async findOne(id: string): Promise<Loan> {
    const loan = await this.loansRepository.findOne({
      where: { id },
      relations: ['client', 'amortizationSchedule', 'payments'],
    });
    if (!loan) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
    }
    return loan;
  }

  async findByClient(clientId: string): Promise<Loan[]> {
    return this.loansRepository.find({
      where: { clientId },
      relations: ['amortizationSchedule', 'payments'],
      order: { createdAt: 'DESC' },
    });
  }

  async approve(id: string, approvedBy: string): Promise<Loan> {
    const loan = await this.findOne(id);

    if (loan.status !== LoanStatus.REQUESTED) {
      throw new BadRequestException('Loan can only be approved when in REQUESTED status');
    }

    loan.status = LoanStatus.APPROVED;
    loan.approvalDate = new Date();
    loan.approvedBy = approvedBy;

    return this.loansRepository.save(loan);
  }

  async reject(id: string, reason: string): Promise<Loan> {
    const loan = await this.findOne(id);

    if (loan.status !== LoanStatus.REQUESTED) {
      throw new BadRequestException('Loan can only be rejected when in REQUESTED status');
    }

    loan.status = LoanStatus.REJECTED;
    loan.rejectedReason = reason;

    return this.loansRepository.save(loan);
  }

  async disburse(id: string): Promise<Loan> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const findOptions: any = { where: { id }, relations: ['client'] };
      if (queryRunner.connection.options.type !== 'sqlite') {
        findOptions.lock = { mode: 'pessimistic_write' };
      }
      const loan = await queryRunner.manager.findOne(Loan, findOptions);

      if (!loan) {
        throw new NotFoundException(`Loan with ID ${id} not found`);
      }

      if (loan.status !== LoanStatus.APPROVED) {
        throw new BadRequestException('Loan can only be disbursed when in APPROVED status');
      }

      const activeLoan = await queryRunner.manager.findOne(Loan, {
        where: [
          { clientId: loan.clientId, status: LoanStatus.IN_MORA, id: Not(loan.id) },
          { clientId: loan.clientId, status: LoanStatus.DISBURSED, id: Not(loan.id) },
          { clientId: loan.clientId, status: LoanStatus.APPROVED, id: Not(loan.id) },
        ],
      });

      if (activeLoan) {
        const statusMessages: Record<LoanStatus, string> = {
          [LoanStatus.IN_MORA]: 'in mora',
          [LoanStatus.DISBURSED]: 'active (disbursed)',
          [LoanStatus.APPROVED]: 'approved pending disbursement',
          [LoanStatus.REQUESTED]: 'requested',
          [LoanStatus.REJECTED]: 'rejected',
          [LoanStatus.LIQUIDATED]: 'liquidated',
        };
        throw new ConflictException(
          `Client has an ${statusMessages[activeLoan.status] || 'active'} loan. Cannot disburse new loan.`,
        );
      }

      loan.status = LoanStatus.DISBURSED;
      loan.disbursementDate = new Date();

      await queryRunner.manager.save(loan);

      const schedule = this.generateAmortizationSchedule(loan);
      await queryRunner.manager.save(AmortizationSchedule, schedule);

      await queryRunner.commitTransaction();
      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  generateAmortizationSchedule(loan: Loan): AmortizationSchedule[] {
    const schedule: AmortizationSchedule[] = [];
    const monthlyRate = loan.annualInterestRate / 100 / 12;
    let balance = loan.amount;
    const startDate = new Date(loan.disbursementDate);

    for (let i = 1; i <= loan.termMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      const interestPayment = balance * monthlyRate;
      const principalPayment = loan.monthlyPayment - interestPayment;
      balance -= principalPayment;

      schedule.push({
        loanId: loan.id,
        installmentNumber: i,
        dueDate: dueDate,
        paymentAmount: loan.monthlyPayment,
        principalAmount: Math.round(principalPayment * 100) / 100,
        interestAmount: Math.round(interestPayment * 100) / 100,
        outstandingPrincipal: Math.round(Math.max(0, balance) * 100) / 100,
        outstandingInterest: 0,
        status: ScheduleStatus.PENDING,
        daysOverdue: 0,
      } as any);
    }

    return schedule;
  }

  async updateLoanStatus(id: string): Promise<Loan> {
    const loan = await this.findOne(id);

    if (loan.status !== LoanStatus.DISBURSED && loan.status !== LoanStatus.IN_MORA) {
      return loan;
    }

    const schedules = await this.scheduleRepository.find({
      where: { loanId: id },
      order: { installmentNumber: 'ASC' },
    });

    const today = new Date();
    let hasOverdue = false;
    let totalDaysOverdue = 0;

    for (const schedule of schedules) {
      if (schedule.status === ScheduleStatus.PENDING) {
        const dueDate = new Date(schedule.dueDate);
        if (dueDate < today) {
          const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          schedule.daysOverdue = daysOverdue;
          schedule.status = ScheduleStatus.OVERDUE;
          hasOverdue = true;
          totalDaysOverdue = Math.max(totalDaysOverdue, daysOverdue);
          await this.scheduleRepository.save(schedule);
        }
      }
    }

    if (hasOverdue && loan.status !== LoanStatus.IN_MORA) {
      loan.status = LoanStatus.IN_MORA;
      loan.daysOverdue = totalDaysOverdue;
      await this.loansRepository.save(loan);
    } else if (!hasOverdue && loan.status === LoanStatus.IN_MORA) {
      loan.status = LoanStatus.DISBURSED;
      loan.daysOverdue = 0;
      await this.loansRepository.save(loan);
    }

    return this.findOne(id);
  }

  async calculateLateInterest(loanId: string): Promise<number> {
    const loan = await this.findOne(loanId);
    const schedules = await this.scheduleRepository.find({
      where: { loanId, status: ScheduleStatus.OVERDUE },
    });

    const lateInterestRate = loan.annualInterestRate * 1.5 / 100 / 12;
    let totalLateInterest = 0;

    for (const schedule of schedules) {
      const dailyInterest = schedule.outstandingInterest * (lateInterestRate / 30);
      totalLateInterest += dailyInterest * schedule.daysOverdue;
    }

    return Math.round(totalLateInterest * 100) / 100;
  }
}
