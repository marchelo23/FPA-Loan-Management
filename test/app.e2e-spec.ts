import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';

Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: crypto.randomUUID,
  },
});
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

describe('Loan Management E2E Tests', () => {
  let app: INestApplication;
  let adminToken: string;
  let analystToken: string;
  let cashierToken: string;
  let testClientId: string;
  let testLoanId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Register and login as admin
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: 'admin_user',
        password: 'AdminPass123!',
        fullName: 'Admin User',
        role: 'admin',
      })
      .expect(201);

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin_user', password: 'AdminPass123!' })
      .expect(200);
    adminToken = adminLogin.body.access_token;

    // Register and login as analyst
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: 'analyst_user',
        password: 'AnalystPass123!',
        fullName: 'Analyst User',
        role: 'credit_analyst',
      })
      .expect(201);

    const analystLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'analyst_user', password: 'AnalystPass123!' })
      .expect(200);
    analystToken = analystLogin.body.access_token;

    // Register and login as cashier
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: 'cashier_user',
        password: 'CashierPass123!',
        fullName: 'Cashier User',
        role: 'cashier',
      })
      .expect(201);

    const cashierLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'cashier_user', password: 'CashierPass123!' })
      .expect(200);
    cashierToken = cashierLogin.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth Flow', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'new_user',
          password: 'NewPass123!',
          fullName: 'New User',
          role: 'cashier',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.username).toBe('new_user');
        });
    });

    it('should login and return JWT token', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'new_user', password: 'NewPass123!' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
        });
    });

    it('should reject login with wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'new_user', password: 'WrongPass' })
        .expect(401);
    });

    it('should get profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.username).toBe('admin_user');
        });
    });

    it('should reject profile request without token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });
  });

  describe('Client CRUD', () => {
    it('should create a client (admin/analyst)', () => {
      return request(app.getHttpServer())
        .post('/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          identificationNumber: '1234567890',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '0991234567',
          address: '123 Main St, City',
          creditScore: 750,
          creditLimit: 10000,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          testClientId = res.body.id;
          expect(res.body.firstName).toBe('John');
          expect(res.body.lastName).toBe('Doe');
          expect(res.body.isActive).toBe(true);
        });
    });

    it('should reject client creation without auth', () => {
      return request(app.getHttpServer())
        .post('/clients')
        .send({
          identificationNumber: '1234567891',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          phone: '0991234568',
          address: '456 Oak Ave',
          creditScore: 700,
          creditLimit: 5000,
        })
        .expect(401);
    });

    it('should reject client creation with invalid data', () => {
      return request(app.getHttpServer())
        .post('/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          identificationNumber: '123',
          firstName: '',
          email: 'invalid-email',
          creditScore: 900,
        })
        .expect(400);
    });

    it('should get all clients', () => {
      return request(app.getHttpServer())
        .get('/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should get client by ID', () => {
      return request(app.getHttpServer())
        .get(`/clients/${testClientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testClientId);
          expect(res.body.firstName).toBe('John');
        });
    });

    it('should update client', () => {
      return request(app.getHttpServer())
        .put(`/clients/${testClientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'John Updated', email: 'john.updated@example.com' })
        .expect(200)
        .expect((res) => {
          expect(res.body.firstName).toBe('John Updated');
          expect(res.body.email).toBe('john.updated@example.com');
        });
    });

    it('should deactivate client', () => {
      return request(app.getHttpServer())
        .delete(`/clients/${testClientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Loan Lifecycle', () => {
    let activeClientId: string;

    beforeAll(async () => {
      // Create an active client for loan tests
      const response = await request(app.getHttpServer())
        .post('/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          identificationNumber: '9876543210',
          firstName: 'Loan',
          lastName: 'Client',
          email: 'loan.client@example.com',
          phone: '0991111111',
          address: '789 Loan St',
          creditScore: 800,
          creditLimit: 50000,
        });
      activeClientId = response.body.id;
    });

    it('should simulate a loan', () => {
      return request(app.getHttpServer())
        .post('/loans/simulate')
        .set('Authorization', `Bearer ${analystToken}`)
        .send({
          amount: 10000,
          annualInterestRate: 12,
          termMonths: 12,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('monthlyPayment');
          expect(res.body).toHaveProperty('totalAmount');
          expect(res.body).toHaveProperty('totalInterest');
          expect(res.body).toHaveProperty('schedule');
          expect(Array.isArray(res.body.schedule)).toBe(true);
          expect(res.body.schedule.length).toBe(12);
        });
    });

    it('should create a loan request (analyst)', () => {
      return request(app.getHttpServer())
        .post('/loans')
        .set('Authorization', `Bearer ${analystToken}`)
        .send({
          clientId: activeClientId,
          amount: 10000,
          annualInterestRate: 12,
          termMonths: 12,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          testLoanId = res.body.id;
          expect(res.body.status).toBe('requested');
          expect(res.body.clientId).toBe(activeClientId);
        });
    });

    it('should reject loan creation if client has active loan', () => {
      return request(app.getHttpServer())
        .post('/loans')
        .set('Authorization', `Bearer ${analystToken}`)
        .send({
          clientId: activeClientId,
          amount: 5000,
          annualInterestRate: 10,
          termMonths: 6,
        })
        .expect(201);
    });

    it('should approve loan (analyst/admin)', () => {
      return request(app.getHttpServer())
        .put(`/loans/${testLoanId}/approve`)
        .set('Authorization', `Bearer ${analystToken}`)
        .send({ approvedBy: 'analyst_user' })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('approved');
        });
    });

    it('should reject loan approval if not in requested status', () => {
      return request(app.getHttpServer())
        .put(`/loans/${testLoanId}/approve`)
        .set('Authorization', `Bearer ${analystToken}`)
        .send({ approvedBy: 'analyst_user' })
        .expect(400);
    });

    it('should disburse loan (admin only)', () => {
      return request(app.getHttpServer())
        .put(`/loans/${testLoanId}/disburse`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('disbursed');
          expect(res.body.disbursementDate).toBeDefined();
        });
    });

    it('should reject disbursement by non-admin', () => {
      // Create another loan for this test (for another client, so it doesn't conflict)
      return request(app.getHttpServer())
        .post('/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          identificationNumber: '8888888888',
          firstName: 'Another',
          lastName: 'Client',
          email: 'another@example.com',
          phone: '0990000000',
          address: '123 St',
          creditScore: 800,
          creditLimit: 50000,
        }).then(clientRes => {
          return request(app.getHttpServer())
            .post('/loans')
            .set('Authorization', `Bearer ${analystToken}`)
            .send({
              clientId: clientRes.body.id,
              amount: 3000,
              annualInterestRate: 15,
              termMonths: 6,
            })
            .then((res) => {
              const loanId = res.body.id;
              return request(app.getHttpServer())
                .put(`/loans/${loanId}/approve`)
                .set('Authorization', `Bearer ${analystToken}`)
                .then(() =>
                  request(app.getHttpServer())
                    .put(`/loans/${loanId}/disburse`)
                    .set('Authorization', `Bearer ${cashierToken}`)
                    .expect(403)
                );
            });
        });
    });

    it('should get loan by ID', () => {
      return request(app.getHttpServer())
        .get(`/loans/${testLoanId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testLoanId);
          expect(res.body.status).toBe('disbursed');
        });
    });

    it('should get all loans', () => {
      return request(app.getHttpServer())
        .get('/loans')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should get loan account status', () => {
      return request(app.getHttpServer())
        .get(`/payments/loan/${testLoanId}/account-status`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('outstandingPrincipal');
          expect(res.body).toHaveProperty('outstandingInterest');
          expect(res.body).toHaveProperty('lateInterest');
          expect(res.body).toHaveProperty('nextPayment');
          expect(res.body).toHaveProperty('daysOverdue');
        });
    });
  });

  describe('Payments', () => {
    let paymentLoanId: string;
    let paymentClientId: string;

    beforeAll(async () => {
      // Create client and loan for payment tests
      const clientRes = await request(app.getHttpServer())
        .post('/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          identificationNumber: '5555555555',
          firstName: 'Payment',
          lastName: 'Tester',
          email: 'payment.tester@example.com',
          phone: '0992222222',
          address: '100 Payment Ave',
          creditScore: 720,
          creditLimit: 20000,
        });
      paymentClientId = clientRes.body.id;

      const loanRes = await request(app.getHttpServer())
        .post('/loans')
        .set('Authorization', `Bearer ${analystToken}`)
        .send({
          clientId: paymentClientId,
          amount: 5000,
          annualInterestRate: 12,
          termMonths: 6,
        });

      await request(app.getHttpServer())
        .put(`/loans/${loanRes.body.id}/approve`)
        .set('Authorization', `Bearer ${analystToken}`);

      await request(app.getHttpServer())
        .put(`/loans/${loanRes.body.id}/disburse`)
        .set('Authorization', `Bearer ${adminToken}`);

      paymentLoanId = loanRes.body.id;
    });

    it('should make a full payment', () => {
      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          loanId: paymentLoanId,
          amount: 870, // Approximate monthly payment
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.loanId).toBe(paymentLoanId);
          expect(res.body.amount).toBe(870);
          expect(res.body).toHaveProperty('principalApplied');
          expect(res.body).toHaveProperty('interestApplied');
          expect(res.body).toHaveProperty('lateInterestApplied');
        });
    });

    it('should make a partial payment', () => {
      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          loanId: paymentLoanId,
          amount: 100, // Partial payment
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.amount).toBe(100);
        });
    });

    it('should get payment history for loan', () => {
      return request(app.getHttpServer())
        .get(`/payments/loan/${paymentLoanId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should reject payment for non-existent loan', () => {
      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          loanId: '5f92c6c0-681b-4f4c-9f69-d7b63f0a1c0d', // dummy uuid
          amount: 100,
        })
        .expect(404);
    });
  });

  describe('Reports', () => {
    it('should get overdue portfolio report', () => {
      return request(app.getHttpServer())
        .get('/reports/overdue-portfolio')
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalOverdueLoans');
        });
    });

    it('should get portfolio summary', () => {
      return request(app.getHttpServer())
        .get('/reports/portfolio-summary')
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalLoans');
          expect(res.body).toHaveProperty('activeLoans');
          expect(res.body).toHaveProperty('loansInMora');
          expect(res.body).toHaveProperty('totalDisbursed');
        });
    });

    it('should get client portfolio', () => {
      return request(app.getHttpServer())
        .get(`/reports/client/${testClientId}`)
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('client');
          expect(res.body).toHaveProperty('summary');
        });
    });

    it('should get payment history report', () => {
      return request(app.getHttpServer())
        .get(`/reports/payment-history/${testLoanId}`)
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeDefined();
        });
    });
  });

  describe('Role-based Access Control', () => {
    it('should allow admin to create users', () => {
      return request(app.getHttpServer())
        .post('/auth/create-user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'new_admin_user',
          password: 'NewAdminPass123!',
          role: 'admin',
        })
        .expect(201);
    });

    it('should deny analyst from creating users', () => {
      return request(app.getHttpServer())
        .post('/auth/create-user')
        .set('Authorization', `Bearer ${analystToken}`)
        .send({
          username: 'should_fail',
          password: 'Pass123!',
          role: 'cashier',
        })
        .expect(403);
    });

    it('should deny cashier from approving loans', () => {
      return request(app.getHttpServer())
        .post('/loans')
        .set('Authorization', `Bearer ${analystToken}`)
        .send({
          clientId: testClientId,
          amount: 2000,
          annualInterestRate: 10,
          termMonths: 3,
        })
        .then((res) => {
          const loanId = res.body.id;
          return request(app.getHttpServer())
            .put(`/loans/${loanId}/approve`)
            .set('Authorization', `Bearer ${cashierToken}`)
            .expect(403);
        });
    });
  });
});