import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientsService } from './clients.service';
import { Client } from './entities/client.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('ClientsService', () => {
  let service: ClientsService;
  let repository: Repository<Client>;

  const mockClient = {
    id: '1',
    identificationNumber: '123456789',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    address: '123 Main St',
    creditScore: 750,
    creditLimit: 10000,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: getRepositoryToken(Client),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    repository = module.get<Repository<Client>>(getRepositoryToken(Client));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new client successfully', async () => {
      const createClientDto = {
        identificationNumber: '123456789',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        address: '123 Main St',
        creditScore: 750,
        creditLimit: 10000,
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(createClientDto);
      mockRepository.save.mockResolvedValue(mockClient);

      const result = await service.create(createClientDto);

      expect(result).toEqual(mockClient);
      expect(mockRepository.create).toHaveBeenCalledWith(createClientDto);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if identification number exists', async () => {
      const createClientDto = {
        identificationNumber: '123456789',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        address: '123 Main St',
        creditScore: 750,
        creditLimit: 10000,
      };

      mockRepository.findOne.mockResolvedValue(mockClient);

      await expect(service.create(createClientDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if email exists', async () => {
      const createClientDto = {
        identificationNumber: '987654321',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'john@example.com',
        phone: '+1234567890',
        address: '123 Main St',
        creditScore: 750,
        creditLimit: 10000,
      };

      mockRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockClient);

      await expect(service.create(createClientDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all active clients', async () => {
      mockRepository.find.mockResolvedValue([mockClient]);

      const result = await service.findAll();

      expect(result).toEqual([mockClient]);
      expect(mockRepository.find).toHaveBeenCalledWith({ where: { isActive: true } });
    });
  });

  describe('findOne', () => {
    it('should return a client by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockClient);

      const result = await service.findOne('1');

      expect(result).toEqual(mockClient);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException if client not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCreditScore', () => {
    it('should update client credit score', async () => {
      mockRepository.findOne.mockResolvedValue(mockClient);
      mockRepository.save.mockResolvedValue({ ...mockClient, creditScore: 800 });

      const result = await service.updateCreditScore('1', 800);

      expect(result.creditScore).toBe(800);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateCreditLimit', () => {
    it('should update client credit limit', async () => {
      mockRepository.findOne.mockResolvedValue(mockClient);
      mockRepository.save.mockResolvedValue({ ...mockClient, creditLimit: 15000 });

      const result = await service.updateCreditLimit('1', 15000);

      expect(result.creditLimit).toBe(15000);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('findByIdentificationNumber', () => {
    it('should return a client by identification number', async () => {
      mockRepository.findOne.mockResolvedValue(mockClient);

      const result = await service.findByIdentificationNumber('123456789');

      expect(result).toEqual(mockClient);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { identificationNumber: '123456789' } });
    });

    it('should throw NotFoundException if client not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findByIdentificationNumber('123456789')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a client successfully', async () => {
      const updateDto = { firstName: 'Jane', creditScore: 800 };
      mockRepository.findOne.mockResolvedValue(mockClient);
      mockRepository.save.mockResolvedValue({ ...mockClient, ...updateDto });

      const result = await service.update('1', updateDto);

      expect(result.firstName).toBe('Jane');
      expect(result.creditScore).toBe(800);
    });

    it('should throw ConflictException if new identification number exists', async () => {
      const updateDto = { identificationNumber: '999999999' };
      mockRepository.findOne
        .mockResolvedValueOnce(mockClient)
        .mockResolvedValueOnce({ ...mockClient, id: '2', identificationNumber: '999999999' });

      await expect(service.update('1', updateDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if new email exists', async () => {
      const updateDto = { email: 'existing@example.com' };
      mockRepository.findOne
        .mockResolvedValueOnce(mockClient)
        .mockResolvedValueOnce({ ...mockClient, id: '2', email: 'existing@example.com' });

      await expect(service.update('1', updateDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should deactivate a client', async () => {
      mockRepository.findOne.mockResolvedValue(mockClient);
      mockRepository.save.mockResolvedValue({ ...mockClient, isActive: false });

      await service.remove('1');

      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    });
  });
});
