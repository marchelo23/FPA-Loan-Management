import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/entities/user.entity';

describe('ReportsController', () => {
  let controller: ReportsController;
  let reportsService: ReportsService;

  const mockReportsService = {
    getOverduePortfolio: jest.fn(),
    getPortfolioSummary: jest.fn(),
    getClientPortfolio: jest.fn(),
    getPaymentHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: mockReportsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReportsController>(ReportsController);
    reportsService = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getOverduePortfolio', () => {
    it('should return overdue portfolio report', async () => {
      const expectedResult = [
        {
          loanId: '1',
          clientId: '1',
          clientName: 'John Doe',
          daysOverdue: 45,
          overdueAmount: 1500,
          range: '31-60',
        },
        {
          loanId: '2',
          clientId: '2',
          clientName: 'Jane Smith',
          daysOverdue: 95,
          overdueAmount: 3000,
          range: '+90',
        },
      ];

      mockReportsService.getOverduePortfolio.mockResolvedValue(expectedResult);

      const result = await controller.getOverduePortfolio();

      expect(result).toEqual(expectedResult);
      expect(reportsService.getOverduePortfolio).toHaveBeenCalled();
    });
  });

  describe('getPortfolioSummary', () => {
    it('should return portfolio summary', async () => {
      const expectedResult = {
        totalLoans: 100,
        activeLoans: 75,
        overdueLoans: 15,
        settledLoans: 10,
        totalPortfolio: 500000,
        overduePortfolio: 75000,
        overduePercentage: 15,
      };

      mockReportsService.getPortfolioSummary.mockResolvedValue(expectedResult);

      const result = await controller.getPortfolioSummary();

      expect(result).toEqual(expectedResult);
      expect(reportsService.getPortfolioSummary).toHaveBeenCalled();
    });
  });

  describe('getClientPortfolio', () => {
    it('should return client portfolio', async () => {
      const expectedResult = {
        clientId: '1',
        clientName: 'John Doe',
        loans: [
          { id: '1', amount: 5000, status: 'DISBURSED', balance: 3000 },
          { id: '2', amount: 3000, status: 'SETTLED', balance: 0 },
        ],
        totalBalance: 3000,
      };

      mockReportsService.getClientPortfolio.mockResolvedValue(expectedResult);

      const result = await controller.getClientPortfolio('1');

      expect(result).toEqual(expectedResult);
      expect(reportsService.getClientPortfolio).toHaveBeenCalledWith('1');
    });
  });

  describe('getPaymentHistory', () => {
    it('should return payment history for a loan', async () => {
      const expectedResult = [
        { id: '1', loanId: '1', amount: 500, paymentDate: new Date('2024-01-15'), principalApplied: 400, interestApplied: 100, lateInterestApplied: 0 },
        { id: '2', loanId: '1', amount: 500, paymentDate: new Date('2024-02-15'), principalApplied: 410, interestApplied: 90, lateInterestApplied: 0 },
      ];

      mockReportsService.getPaymentHistory.mockResolvedValue(expectedResult);

      const result = await controller.getPaymentHistory('1');

      expect(result).toEqual(expectedResult);
      expect(reportsService.getPaymentHistory).toHaveBeenCalledWith('1');
    });
  });
});