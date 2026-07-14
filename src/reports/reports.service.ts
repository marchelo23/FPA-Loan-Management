import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan, LoanStatus } from '../loans/entities/loan.entity';
import { AmortizationSchedule, ScheduleStatus } from '../loans/entities/amortization-schedule.entity';
import { Client } from '../clients/entities/client.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Loan)
    private loansRepository: Repository<Loan>,
    @InjectRepository(AmortizationSchedule)
    private scheduleRepository: Repository<AmortizationSchedule>,
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
  ) {}

  async getOverduePortfolio() {
    const loans = await this.loansRepository.find({
      where: [
        { status: LoanStatus.IN_MORA },
        { status: LoanStatus.DISBURSED },
      ],
      relations: ['client'],
    });

    const today = new Date();
    const portfolio = {
      '1-30': { count: 0, totalAmount: 0, loans: [] },
      '31-60': { count: 0, totalAmount: 0, loans: [] },
      '61-90': { count: 0, totalAmount: 0, loans: [] },
      '+90': { count: 0, totalAmount: 0, loans: [] },
    };

    for (const loan of loans) {
      const schedules = await this.scheduleRepository.find({
        where: { loanId: loan.id, status: ScheduleStatus.OVERDUE },
      });

      if (schedules.length === 0) continue;

      const maxDaysOverdue = Math.max(...schedules.map(s => s.daysOverdue));
      const outstandingAmount = loan.outstandingPrincipal + loan.outstandingInterest + loan.lateInterest;

      let range: string;
      if (maxDaysOverdue <= 30) {
        range = '1-30';
      } else if (maxDaysOverdue <= 60) {
        range = '31-60';
      } else if (maxDaysOverdue <= 90) {
        range = '61-90';
      } else {
        range = '+90';
      }

      portfolio[range].count++;
      portfolio[range].totalAmount += outstandingAmount;
      portfolio[range].loans.push({
        loanId: loan.id,
        clientId: loan.clientId,
        clientName: `${loan.client.firstName} ${loan.client.lastName}`,
        daysOverdue: maxDaysOverdue,
        outstandingAmount,
        status: loan.status,
      });
    }

    return {
      totalOverdueLoans: loans.filter(l => l.status === LoanStatus.IN_MORA).length,
      totalOverdueAmount: Object.values(portfolio).reduce((sum, range) => sum + range.totalAmount, 0),
      byRange: portfolio,
    };
  }

  async getPortfolioSummary() {
    const loans = await this.loansRepository.find({
      relations: ['client'],
    });

    const summary = {
      totalLoans: loans.length,
      activeLoans: loans.filter(l => l.status === LoanStatus.DISBURSED || l.status === LoanStatus.IN_MORA).length,
      loansInMora: loans.filter(l => l.status === LoanStatus.IN_MORA).length,
      liquidatedLoans: loans.filter(l => l.status === LoanStatus.LIQUIDATED).length,
      pendingLoans: loans.filter(l => l.status === LoanStatus.REQUESTED).length,
      approvedLoans: loans.filter(l => l.status === LoanStatus.APPROVED).length,
      rejectedLoans: loans.filter(l => l.status === LoanStatus.REJECTED).length,
      totalDisbursed: loans.reduce((sum, l) => sum + (l.status === LoanStatus.DISBURSED || l.status === LoanStatus.IN_MORA ? Number(l.amount) : 0), 0),
      totalOutstandingPrincipal: loans.reduce((sum, l) => sum + Number(l.outstandingPrincipal), 0),
      totalOutstandingInterest: loans.reduce((sum, l) => sum + Number(l.outstandingInterest), 0),
      totalLateInterest: loans.reduce((sum, l) => sum + Number(l.lateInterest), 0),
    };

    return summary;
  }

  async getClientPortfolio(clientId: string) {
    const loans = await this.loansRepository.find({
      where: { clientId },
      order: { createdAt: 'DESC' },
    });

    const client = await this.clientsRepository.findOne({ where: { id: clientId } });

    return {
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        identificationNumber: client.identificationNumber,
        creditScore: client.creditScore,
        creditLimit: client.creditLimit,
      },
      loans: loans.map(loan => ({
        id: loan.id,
        amount: loan.amount,
        status: loan.status,
        termMonths: loan.termMonths,
        annualInterestRate: loan.annualInterestRate,
        monthlyPayment: loan.monthlyPayment,
        outstandingPrincipal: loan.outstandingPrincipal,
        outstandingInterest: loan.outstandingInterest,
        lateInterest: loan.lateInterest,
        daysOverdue: loan.daysOverdue,
        disbursementDate: loan.disbursementDate,
        liquidationDate: loan.liquidationDate,
      })),
      summary: {
        totalLoans: loans.length,
        activeLoans: loans.filter(l => l.status === LoanStatus.DISBURSED || l.status === LoanStatus.IN_MORA).length,
        loansInMora: loans.filter(l => l.status === LoanStatus.IN_MORA).length,
        totalOutstanding: loans.reduce((sum, l) => sum + Number(l.outstandingPrincipal) + Number(l.outstandingInterest) + Number(l.lateInterest), 0),
      },
    };
  }

  async getPaymentHistory(loanId: string) {
    const loan = await this.loansRepository.findOne({
      where: { id: loanId },
      relations: ['payments'],
    });

    if (!loan) {
      return null;
    }

    return {
      loanId: loan.id,
      amount: loan.amount,
      status: loan.status,
      payments: loan.payments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        paymentType: payment.paymentType,
        principalApplied: payment.principalApplied,
        interestApplied: payment.interestApplied,
        lateInterestApplied: payment.lateInterestApplied,
        paymentDate: payment.paymentDate,
        notes: payment.notes,
      })),
      totalPaid: loan.payments.reduce((sum, p) => sum + Number(p.amount), 0),
      totalPrincipalPaid: loan.payments.reduce((sum, p) => sum + Number(p.principalApplied), 0),
      totalInterestPaid: loan.payments.reduce((sum, p) => sum + Number(p.interestApplied), 0),
      totalLateInterestPaid: loan.payments.reduce((sum, p) => sum + Number(p.lateInterestApplied), 0),
    };
  }
}
