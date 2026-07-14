import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { UserRole } from '../common/entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
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
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        username: 'newuser',
        password: 'password123',
        fullName: 'New User',
        role: UserRole.CASHIER,
      };
      const expectedResult = {
        id: '2',
        username: 'newuser',
        fullName: 'New User',
        role: UserRole.CASHIER,
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expectedResult);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should login and return access token', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'password123',
      };
      const expectedResult = {
        access_token: 'jwt-token',
        user: {
          id: '1',
          username: 'testuser',
          role: UserRole.ADMIN,
          fullName: 'Test User',
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(mockRequest, loginDto);

      expect(result).toEqual(expectedResult);
      expect(authService.login).toHaveBeenCalledWith(mockRequest.user);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const result = await controller.getProfile(mockRequest);

      expect(result).toEqual(mockRequest.user);
    });
  });

  describe('createUser', () => {
    it('should create a new user (admin only)', async () => {
      const registerDto = {
        username: 'newuser',
        password: 'password123',
        fullName: 'New User',
        role: UserRole.CASHIER,
      };
      const expectedResult = {
        id: '2',
        username: 'newuser',
        fullName: 'New User',
        role: UserRole.CASHIER,
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.createUser(registerDto);

      expect(result).toEqual(expectedResult);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });
});