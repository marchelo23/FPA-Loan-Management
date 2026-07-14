import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { LoansService } from './loans.service';
import { Loan, LoanStatus } from './entities/loan.entity';
import { AmortizationSchedule, ScheduleStatus } from './entities/amortization-schedule.entity';
import { ClientsService } from '../clients/clients.service';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';

describe('LoansService', () => {
  let service: LoansService;
  let loansRepository: Repository<Loan>;
  let scheduleRepository: Repository<AmortizationSchedule>;
  let clientsService: ClientsService;
  let dataSource: DataSource;

  const mockLoan = {
    id: '1',
    clientId: 'client-1',
    amount: 5000,
    termMonths: 12,
    annualInterestRate: 15,
    monthlyPayment: 451.26,
    status: LoanStatus.REQUESTED,
    outstandingPrincipal: 5000,
    outstandingInterest: 0,
    lateInterest: 0,
    daysOverdue: 0,
  };

  const mockClient = {
    id: 'client-1',
    identificationNumber: '123456789',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    creditScore: 750,
    creditLimit: 10000,
    isActive: true,
  };

  const mockLoansRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockScheduleRepository = {
    find: jest.fn(),
    save: jest.fn(),
  };

  const mockClientsService = {
    findOne: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    manager: {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    },
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        {
          provide: getRepositoryToken(Loan),
          useValue: mockLoansRepository,
        },
        {
          provide: getRepositoryToken(AmortizationSchedule),
          useValue: mockScheduleRepository,
        },
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<LoansService>(LoansService);
    loansRepository = module.get<Repository<Loan>>(getRepositoryToken(Loan));
    scheduleRepository = module.get<Repository<AmortizationSchedule>>(
      getRepositoryToken(AmortizationSchedule),
    );
    clientsService = module.get<ClientsService>(ClientsService);
    dataSource = module.get<DataSource>(DataSource);

    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateMonthlyPayment', () => {
    it('should calculate monthly payment correctly (French amortization)', () => {
      const payment = service.calculateMonthlyPayment(5000, 15, 12);
      expect(payment).toBeCloseTo(451.29, 2);
    });

    it('should handle zero interest rate', () => {
      const payment = service.calculateMonthlyPayment(5000, 0, 12);
      expect(payment).toBeCloseTo(416.67, 2);
    });
  });

  describe('simulateLoan', () => {
    it('should return loan simulation with schedule', () => {
      const result = service.simulateLoan(5000, 15, 12);

      expect(result).toHaveProperty('monthlyPayment');
      expect(result).toHaveProperty('totalAmount');
      expect(result).toHaveProperty('totalInterest');
      expect(result).toHaveProperty('schedule');
      expect(result.schedule).toHaveLength(12);
      expect(result.monthlyPayment).toBeCloseTo(451.29, 2);
    });
  });

  describe('create', () => {
    it('should create a new loan successfully', async () => {
      const createLoanDto = {
        clientId: 'client-1',
        amount: 5000,
        termMonths: 12,
        annualInterestRate: 15,
      };

      mockClientsService.findOne.mockResolvedValue(mockClient);
      mockLoansRepository.findOne.mockResolvedValue(null);
      mockLoansRepository.create.mockReturnValue(createLoanDto);
      mockLoansRepository.save.mockResolvedValue(mockLoan);

      const result = await service.create(createLoanDto, 'user-1');

      expect(result).toEqual(mockLoan);
      expect(mockClientsService.findOne).toHaveBeenCalledWith('client-1');
    });

    it('should throw BadRequestException if client is inactive', async () => {
      const createLoanDto = {
        clientId: 'client-1',
        amount: 5000,
        termMonths: 12,
        annualInterestRate: 15,
      };

      mockClientsService.findOne.mockResolvedValue({ ...mockClient, isActive: false });

      await expect(service.create(createLoanDto, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if amount exceeds credit limit', async () => {
      const createLoanDto = {
        clientId: 'client-1',
        amount: 15000,
        termMonths: 12,
        annualInterestRate: 15,
      };

      mockClientsService.findOne.mockResolvedValue(mockClient);

      await expect(service.create(createLoanDto, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if client has loan in mora', async () => {
      const createLoanDto = {
        clientId: 'client-1',
        amount: 5000,
        termMonths: 12,
        annualInterestRate: 15,
      };

      mockClientsService.findOne.mockResolvedValue(mockClient);
      mockLoansRepository.findOne.mockResolvedValue({ ...mockLoan, status: LoanStatus.IN_MORA });

      await expect(service.create(createLoanDto, 'user-1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if client has active disbursed loan', async () => {
      const createLoanDto = {
        clientId: 'client-1',
        amount: 5000,
        termMonths: 12,
        annualInterestRate: 15,
      };

      mockClientsService.findOne.mockResolvedValue(mockClient);
      mockLoansRepository.findOne.mockResolvedValue({ ...mockLoan, status: LoanStatus.DISBURSED });

      await expect(service.create(createLoanDto, 'user-1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if client has approved loan', async () => {
      const createLoanDto = {
        clientId: 'client-1',
        amount: 5000,
        termMonths: 12,
        annualInterestRate: 15,
      };

      mockClientsService.findOne.mockResolvedValue(mockClient);
      mockLoansRepository.findOne.mockResolvedValue({ ...mockLoan, status: LoanStatus.APPROVED });

      await expect(service.create(createLoanDto, 'user-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('approve', () => {
    it('should approve a loan successfully', async () => {
      const loanInRequested = { ...mockLoan, status: LoanStatus.REQUESTED };
      mockLoansRepository.findOne.mockResolvedValue(loanInRequested);
      mockLoansRepository.save.mockResolvedValue({ ...loanInRequested, status: LoanStatus.APPROVED, approvedBy: 'user-1' });

      const result = await service.approve('1', 'user-1');

      expect(result.status).toBe(LoanStatus.APPROVED);
      expect(result.approvedBy).toBe('user-1');
    });

    it('should throw BadRequestException if loan is not in REQUESTED status', async () => {
      mockLoansRepository.findOne.mockResolvedValue({ ...mockLoan, status: LoanStatus.APPROVED });

      await expect(service.approve('1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('should reject a loan successfully', async () => {
      const loanInRequested = { ...mockLoan, status: LoanStatus.REQUESTED };
      mockLoansRepository.findOne.mockResolvedValue(loanInRequested);
      mockLoansRepository.save.mockResolvedValue({ ...loanInRequested, status: LoanStatus.REJECTED, rejectedReason: 'Insufficient credit' });

      const result = await service.reject('1', 'Insufficient credit');

      expect(result.status).toBe(LoanStatus.REJECTED);
      expect(result.rejectedReason).toBe('Insufficient credit');
    });
  });

  describe('disburse', () => {
    it('should disburse a loan successfully', async () => {
      const approvedLoan = { ...mockLoan, status: LoanStatus.APPROVED, disbursementDate: new Date() };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(approvedLoan)
        .mockResolvedValueOnce(null);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...approvedLoan, status: LoanStatus.DISBURSED })
        .mockResolvedValueOnce([]);
      mockLoansRepository.findOne.mockResolvedValue({ ...approvedLoan, status: LoanStatus.DISBURSED, amortizationSchedule: [] });

      const result = await service.disburse('1');

      expect(result.status).toBe(LoanStatus.DISBURSED);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if loan not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(service.disburse('1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if loan not in APPROVED status', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue({ ...mockLoan, status: LoanStatus.REQUESTED });

      await expect(service.disburse('1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if client has active loan in mora', async () => {
      const approvedLoan = { ...mockLoan, status: LoanStatus.APPROVED, clientId: 'client-1' };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(approvedLoan)
        .mockResolvedValueOnce({ ...mockLoan, status: LoanStatus.IN_MORA });

      await expect(service.disburse('1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if client has active disbursed loan', async () => {
      const approvedLoan = { ...mockLoan, status: LoanStatus.APPROVED, clientId: 'client-1' };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(approvedLoan)
        .mockResolvedValueOnce({ ...mockLoan, status: LoanStatus.DISBURSED });

      await expect(service.disburse('1')).rejects.toThrow(ConflictException);
    });
  });

  describe('updateLoanStatus', () => {
    it('should return loan unchanged if not DISBURSED or IN_MORA', async () => {
      mockLoansRepository.findOne.mockResolvedValue({ ...mockLoan, status: LoanStatus.REQUESTED });

      const result = await service.updateLoanStatus('1');

      expect(result.status).toBe(LoanStatus.REQUESTED);
    });

    it('should update loan to IN_MORA when overdue payments exist', async () => {
      const loan = { ...mockLoan, status: LoanStatus.DISBURSED };
      const overdueSchedule = {
        id: 'sched-1',
        loanId: '1',
        installmentNumber: 1,
        dueDate: new Date(Date.now() - 86400000 * 10),
        status: ScheduleStatus.PENDING,
        daysOverdue: 0,
      };
      mockLoansRepository.findOne.mockResolvedValue(loan);
      mockScheduleRepository.find.mockResolvedValue([overdueSchedule]);
      mockScheduleRepository.save.mockResolvedValue({ ...overdueSchedule, status: ScheduleStatus.OVERDUE, daysOverdue: 10 });
      mockLoansRepository.save.mockResolvedValue({ ...loan, status: LoanStatus.IN_MORA, daysOverdue: 10 });

      const result = await service.updateLoanStatus('1');

      expect(result.status).toBe(LoanStatus.IN_MORA);
      expect(result.daysOverdue).toBe(10);
    });

    it('should update loan to DISBURSED when no overdue payments', async () => {
      const loan = { ...mockLoan, status: LoanStatus.IN_MORA, daysOverdue: 30 };
      const pendingSchedule = {
        id: 'sched-1',
        loanId: '1',
        installmentNumber: 1,
        dueDate: new Date(Date.now() + 86400000 * 10),
        status: ScheduleStatus.PENDING,
        daysOverdue: 0,
      };
      mockLoansRepository.findOne.mockResolvedValue(loan);
      mockScheduleRepository.find.mockResolvedValue([pendingSchedule]);
      mockLoansRepository.save.mockResolvedValue({ ...loan, status: LoanStatus.DISBURSED, daysOverdue: 0 });

      const result = await service.updateLoanStatus('1');

      expect(result.status).toBe(LoanStatus.DISBURSED);
      expect(result.daysOverdue).toBe(0);
    });
  });

  describe('calculateLateInterest', () => {
    it('should calculate late interest for overdue schedules', async () => {
      const loan = { ...mockLoan, annualInterestRate: 15 };
      const overdueSchedule = {
        id: 'sched-1',
        loanId: '1',
        outstandingInterest: 100,
        daysOverdue: 30,
        status: ScheduleStatus.OVERDUE,
      };
      mockLoansRepository.findOne.mockResolvedValue(loan);
      mockScheduleRepository.find.mockResolvedValue([overdueSchedule]);

      const result = await service.calculateLateInterest('1');

      expect(result).toBeGreaterThan(0);
    });

    it('should return 0 when no overdue schedules', async () => {
      const loan = { ...mockLoan, annualInterestRate: 15 };
      mockLoansRepository.findOne.mockResolvedValue(loan);
      mockScheduleRepository.find.mockResolvedValue([]);

      const result = await service.calculateLateInterest('1');

      expect(result).toBe(0);
    });
  });

  describe('findAll', () => {
    it('should return all loans with relations', async () => {
      mockLoansRepository.find.mockResolvedValue([mockLoan]);

      const result = await service.findAll();

      expect(result).toEqual([mockLoan]);
      expect(mockLoansRepository.find).toHaveBeenCalledWith({
        relations: ['client', 'amortizationSchedule'],
      });
    });
  });

  describe('findOne', () => {
    it('should return a loan by id', async () => {
      mockLoansRepository.findOne.mockResolvedValue(mockLoan);

      const result = await service.findOne('1');

      expect(result).toEqual(mockLoan);
      expect(mockLoansRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['client', 'amortizationSchedule', 'payments'],
      });
    });

    it('should throw NotFoundException if loan not found', async () => {
      mockLoansRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByClient', () => {
    it('should return loans for a client', async () => {
      mockLoansRepository.find.mockResolvedValue([mockLoan]);

      const result = await service.findByClient('client-1');

      expect(result).toEqual([mockLoan]);
      expect(mockLoansRepository.find).toHaveBeenCalledWith({
        where: { clientId: 'client-1' },
        relations: ['amortizationSchedule', 'payments'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('reject', () => {
    it('should throw BadRequestException if loan not in REQUESTED status', async () => {
      mockLoansRepository.findOne.mockResolvedValue({ ...mockLoan, status: LoanStatus.APPROVED });

      await expect(service.reject('1', 'Reason')).rejects.toThrow(BadRequestException);
    });
  });
});
