import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/entities/user.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: PaymentsService;

  const mockPaymentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByLoan: jest.fn(),
    getAccountStatus: jest.fn(),
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
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should register a payment', async () => {
      const createPaymentDto: CreatePaymentDto = {
        loanId: '1',
        amount: 500,
        paymentDate: new Date('2024-01-15'),
      };
      const expectedResult = { id: '1', ...createPaymentDto, createdBy: '1', createdAt: new Date() };

      mockPaymentsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createPaymentDto, mockRequest);

      expect(result).toEqual(expectedResult);
      expect(paymentsService.create).toHaveBeenCalledWith(createPaymentDto, '1');
    });
  });

  describe('findAll', () => {
    it('should return all payments', async () => {
      const expectedResult = [
        { id: '1', loanId: '1', amount: 500, paymentDate: new Date() },
        { id: '2', loanId: '2', amount: 300, paymentDate: new Date() },
      ];

      mockPaymentsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(paymentsService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a payment by ID', async () => {
      const expectedResult = { id: '1', loanId: '1', amount: 500, paymentDate: new Date() };

      mockPaymentsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne('1');

      expect(result).toEqual(expectedResult);
      expect(paymentsService.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('findByLoan', () => {
    it('should return all payments for a loan', async () => {
      const expectedResult = [
        { id: '1', loanId: '1', amount: 500, paymentDate: new Date() },
        { id: '2', loanId: '1', amount: 300, paymentDate: new Date() },
      ];

      mockPaymentsService.findByLoan.mockResolvedValue(expectedResult);

      const result = await controller.findByLoan('1');

      expect(result).toEqual(expectedResult);
      expect(paymentsService.findByLoan).toHaveBeenCalledWith('1');
    });
  });

  describe('getAccountStatus', () => {
    it('should return account status for a loan', async () => {
      const expectedResult = {
        loanId: '1',
        principalBalance: 4500,
        accruedInterest: 50,
        lateInterest: 0,
        nextDueDate: new Date('2024-02-01'),
        nextPaymentAmount: 444.24,
        daysOverdue: 0,
        status: 'DISBURSED',
      };

      mockPaymentsService.getAccountStatus.mockResolvedValue(expectedResult);

      const result = await controller.getAccountStatus('1');

      expect(result).toEqual(expectedResult);
      expect(paymentsService.getAccountStatus).toHaveBeenCalledWith('1');
    });
  });
});