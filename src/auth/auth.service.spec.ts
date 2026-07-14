import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '../common/entities/user.entity';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let repository: Repository<User>;
  let jwtService: JwtService;

  const mockUser = {
    id: '1',
    username: 'testuser',
    password: 'hashedpassword',
    role: UserRole.ADMIN,
    fullName: 'Test User',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password if credentials are valid', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser('testuser', 'password');

      expect(result).not.toHaveProperty('password');
      expect(result.username).toBe('testuser');
    });

    it('should return null if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('testuser', 'password');

      expect(result).toBeNull();
    });

    it('should return null if password is invalid', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser('testuser', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockRepository.findOne.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.validateUser('testuser', 'password')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return access token and user info', async () => {
      const userWithoutPassword = { ...mockUser };
      delete (userWithoutPassword as any).password;

      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(userWithoutPassword);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.access_token).toBe('jwt-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        username: 'testuser',
        sub: '1',
        role: UserRole.ADMIN,
      });
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        username: 'newuser',
        password: 'password123',
        fullName: 'New User',
        role: UserRole.CASHIER,
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(registerDto);
      mockRepository.save.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

      const result = await service.register(registerDto);

      expect(result).not.toHaveProperty('password');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if username exists', async () => {
      const registerDto = {
        username: 'testuser',
        password: 'password123',
      };

      mockRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('1');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });
});
