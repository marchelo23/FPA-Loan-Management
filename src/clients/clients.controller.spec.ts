import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/entities/user.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

describe('ClientsController', () => {
  let controller: ClientsController;
  let clientsService: ClientsService;

  const mockClientsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByIdentificationNumber: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateCreditScore: jest.fn(),
    updateCreditLimit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ClientsController>(ClientsController);
    clientsService = module.get<ClientsService>(ClientsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new client', async () => {
      const createClientDto: CreateClientDto = {
        identificationNumber: '1234567890',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '0991234567',
        address: '123 Main St',
        creditScore: 750,
        creditLimit: 10000,
      };
      const expectedResult = { id: '1', ...createClientDto, isActive: true, createdAt: new Date(), updatedAt: new Date() };

      mockClientsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createClientDto);

      expect(result).toEqual(expectedResult);
      expect(clientsService.create).toHaveBeenCalledWith(createClientDto);
    });
  });

  describe('findAll', () => {
    it('should return all active clients', async () => {
      const expectedResult = [
        { id: '1', fullName: 'John Doe', identificationNumber: '1234567890', isActive: true },
        { id: '2', fullName: 'Jane Smith', identificationNumber: '0987654321', isActive: true },
      ];

      mockClientsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(clientsService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a client by ID', async () => {
      const expectedResult = { id: '1', fullName: 'John Doe', identificationNumber: '1234567890', isActive: true };

      mockClientsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne('1');

      expect(result).toEqual(expectedResult);
      expect(clientsService.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('findByIdentificationNumber', () => {
    it('should return a client by identification number', async () => {
      const expectedResult = { id: '1', fullName: 'John Doe', identificationNumber: '1234567890', isActive: true };

      mockClientsService.findByIdentificationNumber.mockResolvedValue(expectedResult);

      const result = await controller.findByIdentificationNumber('1234567890');

      expect(result).toEqual(expectedResult);
      expect(clientsService.findByIdentificationNumber).toHaveBeenCalledWith('1234567890');
    });
  });

  describe('update', () => {
    it('should update a client', async () => {
      const updateClientDto: UpdateClientDto = {
        firstName: 'John',
        lastName: 'Updated',
        email: 'john.updated@example.com',
      };
      const expectedResult = { id: '1', ...updateClientDto, identificationNumber: '1234567890', isActive: true };

      mockClientsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update('1', updateClientDto);

      expect(result).toEqual(expectedResult);
      expect(clientsService.update).toHaveBeenCalledWith('1', updateClientDto);
    });
  });

  describe('remove', () => {
    it('should deactivate a client', async () => {
      const expectedResult = { id: '1', fullName: 'John Doe', identificationNumber: '1234567890', isActive: false };

      mockClientsService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove('1');

      expect(result).toEqual(expectedResult);
      expect(clientsService.remove).toHaveBeenCalledWith('1');
    });
  });

  describe('updateCreditScore', () => {
    it('should update client credit score', async () => {
      const expectedResult = { id: '1', fullName: 'John Doe', creditScore: 800 };

      mockClientsService.updateCreditScore.mockResolvedValue(expectedResult);

      const result = await controller.updateCreditScore('1', { creditScore: 800 });

      expect(result).toEqual(expectedResult);
      expect(clientsService.updateCreditScore).toHaveBeenCalledWith('1', 800);
    });
  });

  describe('updateCreditLimit', () => {
    it('should update client credit limit', async () => {
      const expectedResult = { id: '1', fullName: 'John Doe', creditLimit: 15000 };

      mockClientsService.updateCreditLimit.mockResolvedValue(expectedResult);

      const result = await controller.updateCreditLimit('1', { creditLimit: 15000 });

      expect(result).toEqual(expectedResult);
      expect(clientsService.updateCreditLimit).toHaveBeenCalledWith('1', 15000);
    });
  });
});