import { Test, TestingModule } from '@nestjs/testing';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/entities/user.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { SimulateLoanDto } from './dto/simulate-loan.dto';

describe('LoansController', () => {
  let controller: LoansController;
  let loansService: LoansService;

  const mockLoansService = {
    create: jest.fn(),
    simulateLoan: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByClient: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    disburse: jest.fn(),
    updateLoanStatus: jest.fn(),
    calculateLateInterest: jest.fn(),
  };

  const mockRequest = {
    user: {
      id: '1',
      username: 'testuser',
      role: UserRole.ADMIN,
      fullName: 'Test User',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoansController],
      providers: [
        {
          provide: LoansService,
          useValue: mockLoansService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LoansController>(LoansController);
    loansService = module.get<LoansService>(LoansService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new loan request', async () => {
      const createLoanDto: CreateLoanDto = {
        clientId: '1',
        amount: 5000,
        annualInterestRate: 12,
        termMonths: 12,
      };
      const expectedResult = { id: '1', ...createLoanDto, status: 'REQUESTED', createdAt: new Date(), updatedAt: new Date() };

      mockLoansService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createLoanDto, mockRequest);

      expect(result).toEqual(expectedResult);
      expect(loansService.create).toHaveBeenCalledWith(createLoanDto, '1');
    });
  });

  describe('simulate', () => {
    it('should simulate a loan calculation', async () => {
      const simulateLoanDto: SimulateLoanDto = {
        amount: 5000,
        annualInterestRate: 12,
        termMonths: 12,
      };
      const expectedResult = {
        monthlyPayment: 444.24,
        totalInterest: 330.88,
        totalAmount: 5330.88,
        amortizationSchedule: [],
      };

      mockLoansService.simulateLoan.mockResolvedValue(expectedResult);

      const result = await controller.simulate(simulateLoanDto);

      expect(result).toEqual(expectedResult);
      expect(loansService.simulateLoan).toHaveBeenCalledWith(5000, 12, 12);
    });
  });

  describe('findAll', () => {
    it('should return all loans', async () => {
      const expectedResult = [
        { id: '1', amount: 5000, status: 'DISBURSED' },
        { id: '2', amount: 3000, status: 'APPROVED' },
      ];

      mockLoansService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(loansService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a loan by ID', async () => {
      const expectedResult = { id: '1', amount: 5000, status: 'DISBURSED' };

      mockLoansService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne('1');

      expect(result).toEqual(expectedResult);
      expect(loansService.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('findByClient', () => {
    it('should return all loans for a client', async () => {
      const expectedResult = [
        { id: '1', amount: 5000, status: 'DISBURSED' },
        { id: '2', amount: 3000, status: 'SETTLED' },
      ];

      mockLoansService.findByClient.mockResolvedValue(expectedResult);

      const result = await controller.findByClient('1');

      expect(result).toEqual(expectedResult);
      expect(loansService.findByClient).toHaveBeenCalledWith('1');
    });
  });

  describe('approve', () => {
    it('should approve a loan', async () => {
      const expectedResult = { id: '1', amount: 5000, status: 'APPROVED' };

      mockLoansService.approve.mockResolvedValue(expectedResult);

      const result = await controller.approve('1', mockRequest);

      expect(result).toEqual(expectedResult);
      expect(loansService.approve).toHaveBeenCalledWith('1', '1');
    });
  });

  describe('reject', () => {
    it('should reject a loan', async () => {
      const expectedResult = { id: '1', amount: 5000, status: 'REJECTED', rejectionReason: 'Low credit score' };

      mockLoansService.reject.mockResolvedValue(expectedResult);

      const result = await controller.reject('1', { reason: 'Low credit score' });

      expect(result).toEqual(expectedResult);
      expect(loansService.reject).toHaveBeenCalledWith('1', 'Low credit score');
    });
  });

  describe('disburse', () => {
    it('should disburse a loan', async () => {
      const expectedResult = { id: '1', amount: 5000, status: 'DISBURSED' };

      mockLoansService.disburse.mockResolvedValue(expectedResult);

      const result = await controller.disburse('1');

      expect(result).toEqual(expectedResult);
      expect(loansService.disburse).toHaveBeenCalledWith('1');
    });
  });

  describe('updateStatus', () => {
    it('should update loan status', async () => {
      const expectedResult = { id: '1', amount: 5000, status: 'IN_MORA' };

      mockLoansService.updateLoanStatus.mockResolvedValue(expectedResult);

      const result = await controller.updateStatus('1');

      expect(result).toEqual(expectedResult);
      expect(loansService.updateLoanStatus).toHaveBeenCalledWith('1');
    });
  });

  describe('calculateLateInterest', () => {
    it('should calculate late interest for a loan', async () => {
      const expectedResult = { lateInterest: 150.50 };

      mockLoansService.calculateLateInterest.mockResolvedValue(150.50);

      const result = await controller.calculateLateInterest('1');

      expect(result).toEqual(expectedResult);
      expect(loansService.calculateLateInterest).toHaveBeenCalledWith('1');
    });
  });
});