import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PaymentsService } from './payments.service';
import { Payment, PaymentType } from './entities/payment.entity';
import { Loan, LoanStatus } from '../loans/entities/loan.entity';
import { AmortizationSchedule, ScheduleStatus } from '../loans/entities/amortization-schedule.entity';
import { LoansService } from '../loans/loans.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentsRepository: Repository<Payment>;
  let loansRepository: Repository<Loan>;
  let scheduleRepository: Repository<AmortizationSchedule>;
  let loansService: LoansService;
  let dataSource: DataSource;

  const mockPayment = {
    id: '1',
    loanId: 'loan-1',
    amount: 500,
    paymentType: PaymentType.PARTIAL,
    principalApplied: 300,
    interestApplied: 200,
    lateInterestApplied: 0,
    paymentDate: new Date(),
    receivedBy: 'user-1',
  };

  const mockLoan = {
    id: 'loan-1',
    clientId: 'client-1',
    amount: 5000,
    status: LoanStatus.DISBURSED,
    outstandingPrincipal: 4000,
    outstandingInterest: 500,
    lateInterest: 0,
    daysOverdue: 0,
  };

  const mockSchedule = {
    id: '1',
    loanId: 'loan-1',
    installmentNumber: 1,
    dueDate: new Date(),
    paymentAmount: 451.26,
    principalAmount: 300,
    interestAmount: 151.26,
    outstandingPrincipal: 300,
    outstandingInterest: 151.26,
    status: ScheduleStatus.PENDING,
    daysOverdue: 0,
  };

  const mockPaymentsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockLoansRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockScheduleRepository = {
    find: jest.fn(),
    save: jest.fn(),
  };

  const mockLoansService = {
    calculateLateInterest: jest.fn(),
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
      create: jest.fn(),
    },
    connection: { options: { type: 'postgres' } },
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentsRepository,
        },
        {
          provide: getRepositoryToken(Loan),
          useValue: mockLoansRepository,
        },
        {
          provide: getRepositoryToken(AmortizationSchedule),
          useValue: mockScheduleRepository,
        },
        {
          provide: LoansService,
          useValue: mockLoansService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentsRepository = module.get<Repository<Payment>>(getRepositoryToken(Payment));
    loansRepository = module.get<Repository<Loan>>(getRepositoryToken(Loan));
    scheduleRepository = module.get<Repository<AmortizationSchedule>>(
      getRepositoryToken(AmortizationSchedule),
    );
    loansService = module.get<LoansService>(LoansService);
    dataSource = module.get<DataSource>(DataSource);

    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('determinePaymentType', () => {
    it('should return FULL if payment covers all outstanding', () => {
      const loan = {
        outstandingPrincipal: 1000,
        outstandingInterest: 100,
        lateInterest: 0,
      };
      const result = service['determinePaymentType'](loan as any, 1100);
      expect(result).toBe(PaymentType.FULL);
    });

    it('should return EARLY_SETTLEMENT if payment covers principal', () => {
      const loan = {
        outstandingPrincipal: 1000,
        outstandingInterest: 100,
        lateInterest: 0,
      };
      const result = service['determinePaymentType'](loan as any, 1000);
      expect(result).toBe(PaymentType.EARLY_SETTLEMENT);
    });

    it('should return PARTIAL for partial payments', () => {
      const loan = {
        outstandingPrincipal: 1000,
        outstandingInterest: 100,
        lateInterest: 0,
      };
      const result = service['determinePaymentType'](loan as any, 500);
      expect(result).toBe(PaymentType.PARTIAL);
    });
  });

  describe('findAll', () => {
    it('should return all payments', async () => {
      mockPaymentsRepository.find.mockResolvedValue([mockPayment]);

      const result = await service.findAll();

      expect(result).toEqual([mockPayment]);
      expect(mockPaymentsRepository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a payment by id', async () => {
      mockPaymentsRepository.findOne.mockResolvedValue(mockPayment);

      const result = await service.findOne('1');

      expect(result).toEqual(mockPayment);
      expect(mockPaymentsRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['loan'],
      });
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPaymentsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByLoan', () => {
    it('should return all payments for a loan', async () => {
      mockPaymentsRepository.find.mockResolvedValue([mockPayment]);

      const result = await service.findByLoan('loan-1');

      expect(result).toEqual([mockPayment]);
      expect(mockPaymentsRepository.find).toHaveBeenCalledWith({
        where: { loanId: 'loan-1' },
        relations: ['loan'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getAccountStatus', () => {
    it('should return account status for a loan', async () => {
      const mockLoansService = {
        findOne: jest.fn().mockResolvedValue(mockLoan),
      };
      (service as any).loansService = mockLoansService;

      mockScheduleRepository.find.mockResolvedValue([mockSchedule]);

      const result = await service.getAccountStatus('loan-1');

      expect(result).toHaveProperty('loanId');
      expect(result).toHaveProperty('outstandingPrincipal');
      expect(result).toHaveProperty('nextPayment');
    });

    it('should return null nextPayment when all installments paid', async () => {
      const mockLoansService = {
        findOne: jest.fn().mockResolvedValue({ ...mockLoan, termMonths: 12 }),
      };
      (service as any).loansService = mockLoansService;

      mockScheduleRepository.find.mockResolvedValue([
        { ...mockSchedule, status: ScheduleStatus.PAID, installmentNumber: 1 },
        { ...mockSchedule, status: ScheduleStatus.PAID, installmentNumber: 2 },
      ]);

      const result = await service.getAccountStatus('loan-1');

      expect(result.nextPayment).toBeNull();
      expect(result.paidInstallments).toBe(2);
      expect(result.pendingInstallments).toBe(0);
    });

    it('should include overdue installments in pending count', async () => {
      const mockLoansService = {
        findOne: jest.fn().mockResolvedValue({ ...mockLoan, termMonths: 12, daysOverdue: 15 }),
      };
      (service as any).loansService = mockLoansService;

      mockScheduleRepository.find.mockResolvedValue([
        { ...mockSchedule, status: ScheduleStatus.OVERDUE, installmentNumber: 1 },
        { ...mockSchedule, status: ScheduleStatus.PENDING, installmentNumber: 2 },
      ]);

      const result = await service.getAccountStatus('loan-1');

      expect(result.pendingInstallments).toBe(2);
      expect(result.daysOverdue).toBe(15);
    });

    it('should calculate totalOutstanding correctly', async () => {
      const mockLoansService = {
        findOne: jest.fn().mockResolvedValue({
          ...mockLoan,
          outstandingPrincipal: 3000,
          outstandingInterest: 200,
          lateInterest: 100,
          termMonths: 12,
        }),
      };
      (service as any).loansService = mockLoansService;

      mockScheduleRepository.find.mockResolvedValue([mockSchedule]);

      const result = await service.getAccountStatus('loan-1');

      expect(result.totalOutstanding).toBe(3300);
    });
  });

  describe('create', () => {
    const createPaymentDto = {
      loanId: 'loan-1',
      amount: 500,
      paymentDate: new Date(),
      notes: 'Test payment',
    };

    it('should create a payment successfully', async () => {
      const loan = { ...mockLoan, outstandingPrincipal: 4000, outstandingInterest: 500, lateInterest: 0 };
      const schedules = [
        { ...mockSchedule, outstandingPrincipal: 300, outstandingInterest: 151.26, status: ScheduleStatus.PENDING },
      ];
      const savedPayment = { ...mockPayment, id: 'payment-1' };

      mockQueryRunner.manager.findOne.mockResolvedValue(loan);
      mockQueryRunner.manager.find.mockResolvedValue(schedules);
      mockLoansService.calculateLateInterest.mockResolvedValue(0);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce(schedules[0])
        .mockResolvedValueOnce(loan)
        .mockResolvedValueOnce(savedPayment);
      mockQueryRunner.manager.create.mockReturnValue(savedPayment);

      const result = await service.create(createPaymentDto, 'user-1');

      expect(result).toEqual(savedPayment);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if loan not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(service.create(createPaymentDto, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if loan not active', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue({ ...mockLoan, status: LoanStatus.REQUESTED });

      await expect(service.create(createPaymentDto, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should apply late interest first, then interest, then principal', async () => {
      const loan = { ...mockLoan, outstandingPrincipal: 4000, outstandingInterest: 500, lateInterest: 200 };
      const schedules = [
        { ...mockSchedule, outstandingPrincipal: 300, outstandingInterest: 151.26, status: ScheduleStatus.OVERDUE },
      ];
      const savedPayment = { ...mockPayment, id: 'payment-1', lateInterestApplied: 200, interestApplied: 151.26, principalApplied: 148.74 };

      mockQueryRunner.manager.findOne.mockResolvedValue(loan);
      mockQueryRunner.manager.find.mockResolvedValue(schedules);
      mockLoansService.calculateLateInterest.mockResolvedValue(200);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...schedules[0], outstandingInterest: 0 })
        .mockResolvedValueOnce({ ...loan, lateInterest: 0, outstandingInterest: 348.74, outstandingPrincipal: 3851.26 })
        .mockResolvedValueOnce(savedPayment);
      mockQueryRunner.manager.create.mockReturnValue(savedPayment);

      const result = await service.create(createPaymentDto, 'user-1');

      expect(result.lateInterestApplied).toBe(200);
      expect(result.interestApplied).toBe(151.26);
      expect(result.principalApplied).toBeCloseTo(148.74, 1);
    });

    it('should mark loan as LIQUIDATED when fully paid', async () => {
      const loan = { ...mockLoan, outstandingPrincipal: 100, outstandingInterest: 10, lateInterest: 0, status: LoanStatus.DISBURSED };
      const schedules = [
        { ...mockSchedule, outstandingPrincipal: 100, outstandingInterest: 10, status: ScheduleStatus.PENDING },
      ];
      const savedPayment = { ...mockPayment, id: 'payment-1', principalApplied: 100, interestApplied: 10, paymentType: PaymentType.FULL };

      mockQueryRunner.manager.findOne.mockResolvedValue(loan);
      mockQueryRunner.manager.find.mockResolvedValue(schedules);
      mockLoansService.calculateLateInterest.mockResolvedValue(0);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...schedules[0], status: ScheduleStatus.PAID, outstandingPrincipal: 0, outstandingInterest: 0 })
        .mockResolvedValueOnce({ ...loan, status: LoanStatus.LIQUIDATED, liquidationDate: expect.any(Date), outstandingPrincipal: 0, outstandingInterest: 0 })
        .mockResolvedValueOnce(savedPayment);
      mockQueryRunner.manager.create.mockReturnValue(savedPayment);

      const result = await service.create({ ...createPaymentDto, amount: 110 }, 'user-1');

      expect(result.paymentType).toBe(PaymentType.FULL);
    });

    it('should apply payment to late interest when no overdue schedules but loan has lateInterest', async () => {
      const loan = { ...mockLoan, outstandingPrincipal: 4000, outstandingInterest: 500, lateInterest: 100, status: LoanStatus.IN_MORA };
      const schedules = [
        { ...mockSchedule, outstandingPrincipal: 300, outstandingInterest: 151.26, status: ScheduleStatus.PAID },
      ];
      const savedPayment = { ...mockPayment, id: 'payment-1', lateInterestApplied: 100, interestApplied: 0, principalApplied: 0 };

      mockQueryRunner.manager.findOne.mockResolvedValue(loan);
      mockQueryRunner.manager.find.mockResolvedValue(schedules);
      mockLoansService.calculateLateInterest.mockResolvedValue(100);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...loan, lateInterest: 0, outstandingPrincipal: 4000, outstandingInterest: 500 })
        .mockResolvedValueOnce(savedPayment);
      mockQueryRunner.manager.create.mockReturnValue(savedPayment);

      const result = await service.create({ ...createPaymentDto, amount: 100 }, 'user-1');

      expect(result.lateInterestApplied).toBe(100);
    });

    it('should apply extra payment to already paid schedules when remaining amount', async () => {
      const loan = { ...mockLoan, outstandingPrincipal: 4000, outstandingInterest: 0, lateInterest: 0, status: LoanStatus.DISBURSED };
      const schedules = [
        { ...mockSchedule, outstandingPrincipal: 0, outstandingInterest: 0, status: ScheduleStatus.PAID },
      ];
      const savedPayment = { ...mockPayment, id: 'payment-1', principalApplied: 500, interestApplied: 0, lateInterestApplied: 0 };

      mockQueryRunner.manager.findOne.mockResolvedValue(loan);
      mockQueryRunner.manager.find.mockResolvedValue(schedules);
      mockLoansService.calculateLateInterest.mockResolvedValue(0);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...loan, outstandingPrincipal: 3500, outstandingInterest: 0 })
        .mockResolvedValueOnce(savedPayment);
      mockQueryRunner.manager.create.mockReturnValue(savedPayment);

      const result = await service.create({ ...createPaymentDto, amount: 500 }, 'user-1');

      expect(result.principalApplied).toBe(500);
    });

    it('should rollback transaction on error', async () => {
      mockQueryRunner.manager.findOne.mockRejectedValue(new Error('DB Error'));

      await expect(service.create(createPaymentDto, 'user-1')).rejects.toThrow('DB Error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all payments with relations', async () => {
      mockPaymentsRepository.find.mockResolvedValue([mockPayment]);

      const result = await service.findAll();

      expect(result).toEqual([mockPayment]);
      expect(mockPaymentsRepository.find).toHaveBeenCalledWith({
        relations: ['loan'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findByLoan', () => {
    it('should return payments for a loan with correct order', async () => {
      mockPaymentsRepository.find.mockResolvedValue([mockPayment]);

      const result = await service.findByLoan('loan-1');

      expect(result).toEqual([mockPayment]);
      expect(mockPaymentsRepository.find).toHaveBeenCalledWith({
        where: { loanId: 'loan-1' },
        relations: ['loan'],
        order: { createdAt: 'DESC' },
      });
    });
  });
});
