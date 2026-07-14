import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportsService } from './reports.service';
import { Loan, LoanStatus } from '../loans/entities/loan.entity';
import { AmortizationSchedule, ScheduleStatus } from '../loans/entities/amortization-schedule.entity';
import { Client } from '../clients/entities/client.entity';

describe('ReportsService', () => {
  let service: ReportsService;
  let loansRepository: Repository<Loan>;
  let scheduleRepository: Repository<AmortizationSchedule>;
  let clientsRepository: Repository<Client>;

  const mockLoan = {
    id: 'loan-1',
    clientId: 'client-1',
    amount: 5000,
    status: LoanStatus.IN_MORA,
    outstandingPrincipal: 4000,
    outstandingInterest: 500,
    lateInterest: 100,
    daysOverdue: 45,
    client: {
      id: 'client-1',
      firstName: 'John',
      lastName: 'Doe',
      identificationNumber: '123456789',
    },
  };

  const mockSchedule = {
    id: '1',
    loanId: 'loan-1',
    installmentNumber: 1,
    dueDate: new Date('2024-01-01'),
    paymentAmount: 451.26,
    principalAmount: 300,
    interestAmount: 151.26,
    outstandingPrincipal: 300,
    outstandingInterest: 151.26,
    status: ScheduleStatus.OVERDUE,
    daysOverdue: 45,
  };

  const mockClient = {
    id: 'client-1',
    firstName: 'John',
    lastName: 'Doe',
    identificationNumber: '123456789',
    email: 'john@example.com',
    creditScore: 750,
    creditLimit: 10000,
  };

  const mockLoansRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockScheduleRepository = {
    find: jest.fn(),
  };

  const mockClientsRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getRepositoryToken(Loan),
          useValue: mockLoansRepository,
        },
        {
          provide: getRepositoryToken(AmortizationSchedule),
          useValue: mockScheduleRepository,
        },
        {
          provide: getRepositoryToken(Client),
          useValue: mockClientsRepository,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    loansRepository = module.get<Repository<Loan>>(getRepositoryToken(Loan));
    scheduleRepository = module.get<Repository<AmortizationSchedule>>(
      getRepositoryToken(AmortizationSchedule),
    );
    clientsRepository = module.get<Repository<Client>>(getRepositoryToken(Client));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOverduePortfolio', () => {
    it('should return overdue portfolio grouped by days overdue', async () => {
      mockLoansRepository.find.mockResolvedValue([mockLoan]);
      mockScheduleRepository.find.mockResolvedValue([mockSchedule]);

      const result = await service.getOverduePortfolio();

      expect(result).toHaveProperty('totalOverdueLoans');
      expect(result).toHaveProperty('totalOverdueAmount');
      expect(result).toHaveProperty('byRange');
      expect(result.byRange).toHaveProperty('1-30');
      expect(result.byRange).toHaveProperty('31-60');
      expect(result.byRange).toHaveProperty('61-90');
      expect(result.byRange).toHaveProperty('+90');
    });

    it('should categorize loans correctly by days overdue', async () => {
      const schedule30Days = { ...mockSchedule, daysOverdue: 15 };
      const schedule60Days = { ...mockSchedule, daysOverdue: 45 };
      const schedule90Days = { ...mockSchedule, daysOverdue: 75 };
      const schedule90PlusDays = { ...mockSchedule, daysOverdue: 120 };

      const loan30Days = { ...mockLoan, id: 'loan-1', status: LoanStatus.IN_MORA };
      const loan60Days = { ...mockLoan, id: 'loan-2', status: LoanStatus.IN_MORA };
      const loan90Days = { ...mockLoan, id: 'loan-3', status: LoanStatus.IN_MORA };
      const loan90PlusDays = { ...mockLoan, id: 'loan-4', status: LoanStatus.IN_MORA };

      mockLoansRepository.find.mockResolvedValue([loan30Days, loan60Days, loan90Days, loan90PlusDays]);
      mockScheduleRepository.find
        .mockResolvedValueOnce([schedule30Days])
        .mockResolvedValueOnce([schedule60Days])
        .mockResolvedValueOnce([schedule90Days])
        .mockResolvedValueOnce([schedule90PlusDays]);

      const result = await service.getOverduePortfolio();

      expect(result.byRange['1-30'].count).toBeGreaterThan(0);
      expect(result.byRange['31-60'].count).toBeGreaterThan(0);
      expect(result.byRange['61-90'].count).toBeGreaterThan(0);
      expect(result.byRange['+90'].count).toBeGreaterThan(0);
    });
  });

  describe('getPortfolioSummary', () => {
    it('should return portfolio summary', async () => {
      const loans = [
        { ...mockLoan, status: LoanStatus.DISBURSED, amount: 5000, outstandingPrincipal: 4000 },
        { ...mockLoan, status: LoanStatus.IN_MORA, amount: 3000, outstandingPrincipal: 2500 },
        { ...mockLoan, status: LoanStatus.LIQUIDATED, amount: 2000, outstandingPrincipal: 0 },
        { ...mockLoan, status: LoanStatus.REQUESTED, amount: 1000, outstandingPrincipal: 1000 },
        { ...mockLoan, status: LoanStatus.APPROVED, amount: 1500, outstandingPrincipal: 1500 },
        { ...mockLoan, status: LoanStatus.REJECTED, amount: 500, outstandingPrincipal: 500 },
      ];

      mockLoansRepository.find.mockResolvedValue(loans);

      const result = await service.getPortfolioSummary();

      expect(result).toHaveProperty('totalLoans');
      expect(result).toHaveProperty('activeLoans');
      expect(result).toHaveProperty('loansInMora');
      expect(result).toHaveProperty('liquidatedLoans');
      expect(result).toHaveProperty('pendingLoans');
      expect(result).toHaveProperty('approvedLoans');
      expect(result).toHaveProperty('rejectedLoans');
      expect(result.totalLoans).toBe(6);
    });
  });

  describe('getClientPortfolio', () => {
    it('should return client portfolio with loans', async () => {
      const loans = [mockLoan];
      mockLoansRepository.find.mockResolvedValue(loans);
      mockClientsRepository.findOne.mockResolvedValue(mockClient);

      const result = await service.getClientPortfolio('client-1');

      expect(result).toHaveProperty('client');
      expect(result).toHaveProperty('loans');
      expect(result).toHaveProperty('summary');
      expect(result.client.id).toBe('client-1');
      expect(result.loans).toHaveLength(1);
    });
  });

  describe('getPaymentHistory', () => {
    it('should return payment history for a loan', async () => {
      const loanWithPayments = {
        ...mockLoan,
        payments: [
          {
            id: '1',
            amount: 500,
            paymentType: 'partial',
            principalApplied: 300,
            interestApplied: 200,
            lateInterestApplied: 0,
            paymentDate: new Date(),
            notes: 'Payment',
          },
        ],
      };

      mockLoansRepository.findOne.mockResolvedValue(loanWithPayments);

      const result = await service.getPaymentHistory('loan-1');

      expect(result).toHaveProperty('loanId');
      expect(result).toHaveProperty('payments');
      expect(result).toHaveProperty('totalPaid');
      expect(result.payments).toHaveLength(1);
    });

    it('should return null if loan not found', async () => {
      mockLoansRepository.findOne.mockResolvedValue(null);

      const result = await service.getPaymentHistory('loan-1');

      expect(result).toBeNull();
    });
  });
});
