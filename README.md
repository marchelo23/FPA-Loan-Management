# Loan Management API

A comprehensive backend API for personal loan management system designed for microfinance institutions and P2P lending platforms. This system provides complete traceability from loan application to liquidation with automated financial calculations and credit lifecycle management.

## Features

- **Client Management**: CRUD operations with credit score and credit limit tracking
- **Loan Lifecycle**: Request, approve, disburse, and liquidate loans with automated state transitions
- **Amortization**: Automatic generation of amortization schedules using French amortization method
- **Payment Processing**: Transaction-based payment application with correct order (late interest → current interest → principal)
- **Late Interest Calculation**: Automatic calculation of mora interest based on days overdue
- **Account Status**: Real-time account status with outstanding balances and next payment information
- **Portfolio Reports**: Overdue portfolio analysis grouped by days overdue (1-30, 31-60, 61-90, +90)
- **Role-Based Access Control**: Admin, Credit Analyst, and Cashier roles with specific permissions
- **Authentication**: JWT-based authentication with protected routes
- **API Documentation**: Swagger/OpenAPI documentation included

## Tech Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with Passport
- **Validation**: class-validator and class-transformer
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest and Supertest

## Prerequisites

- Node.js 20.x or higher
- PostgreSQL 12.x or higher
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd FPA
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=loan_management

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# Application
PORT=3000
```

4. Create the PostgreSQL database:
```sql
CREATE DATABASE loan_management;
```

## Running the Application

### Development Mode
```bash
npm run start:dev
```

### Production Mode
```bash
npm run build
npm run start:prod
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch
```

## API Documentation

Once the application is running, access the Swagger documentation at:
```
http://localhost:3000/api
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user
- `GET /auth/profile` - Get current user profile (protected)

### Clients
- `POST /clients` - Create a new client (Admin/Credit Analyst)
- `GET /clients` - Get all active clients (protected)
- `GET /clients/:id` - Get client by ID (protected)
- `GET /clients/identification/:identificationNumber` - Get client by identification number (protected)
- `PUT /clients/:id` - Update client (Admin/Credit Analyst)
- `DELETE /clients/:id` - Deactivate client (Admin)
- `PUT /clients/:id/credit-score` - Update credit score (Admin/Credit Analyst)
- `PUT /clients/:id/credit-limit` - Update credit limit (Admin)

### Loans
- `POST /loans` - Create loan request (Admin/Credit Analyst)
- `POST /loans/simulate` - Simulate loan calculation (protected)
- `GET /loans` - Get all loans (protected)
- `GET /loans/:id` - Get loan by ID (protected)
- `GET /loans/client/:clientId` - Get loans by client (protected)
- `PUT /loans/:id/approve` - Approve loan (Admin/Credit Analyst)
- `PUT /loans/:id/reject` - Reject loan (Admin/Credit Analyst)
- `PUT /loans/:id/disburse` - Disburse loan (Admin/Cashier)
- `PUT /loans/:id/update-status` - Update loan status/check for overdue (Admin/Credit Analyst)
- `GET /loans/:id/late-interest` - Calculate late interest (Admin/Credit Analyst)

### Payments
- `POST /payments` - Register payment (Admin/Cashier)
- `GET /payments` - Get all payments (protected)
- `GET /payments/:id` - Get payment by ID (protected)
- `GET /payments/loan/:loanId` - Get payments by loan (protected)
- `GET /payments/loan/:loanId/account-status` - Get account status (protected)

### Reports
- `GET /reports/overdue-portfolio` - Get overdue portfolio report (Admin/Credit Analyst)
- `GET /reports/portfolio-summary` - Get portfolio summary (Admin/Credit Analyst)
- `GET /reports/client/:clientId` - Get client portfolio (protected)
- `GET /reports/payment-history/:loanId` - Get payment history (protected)

## Business Logic

### French Amortization Formula
The system uses the French amortization method to calculate fixed monthly payments:

```
PMT = P × [r(1+r)^n] / [(1+r)^n - 1]

Where:
PMT = Monthly payment
P = Principal amount
r = Monthly interest rate (annual rate / 12 / 100)
n = Number of months
```

### Payment Application Order
Payments are applied in the following order to ensure proper accounting:
1. Late interest (mora interest)
2. Current interest
3. Principal

### Loan Status Transitions
- `REQUESTED` → `APPROVED` (by Credit Analyst or Admin)
- `APPROVED` → `DISBURSED` (by Cashier or Admin)
- `DISBURSED` → `IN_MORA` (automatic when payment is overdue)
- `IN_MORA` → `DISBURSED` (automatic when overdue is cleared)
- `DISBURSED` → `LIQUIDATED` (automatic when fully paid)
- `REQUESTED` → `REJECTED` (by Credit Analyst or Admin)

### Late Interest Calculation
Late interest is calculated at 1.5x the annual interest rate, prorated by days overdue:
```
Daily Late Interest = Outstanding Interest × (1.5 × Annual Rate / 12 / 30)
Total Late Interest = Daily Late Interest × Days Overdue
```

### Business Rules
- Cannot disburse a new loan if the client has an active loan in mora
- Loan amount cannot exceed client's credit limit
- Client must be active to receive loans
- Credit score range: 300-850
- Automatic status transition to mora when payment due date is exceeded

## Roles and Permissions

### Admin
- Full access to all endpoints
- Can create and manage users
- Can approve/reject/disburse loans
- Can access all reports

### Credit Analyst
- Can create and manage clients
- Can create, approve, and reject loan requests
- Can access portfolio reports
- Cannot disburse loans

### Cashier
- Can register payments
- Can disburse approved loans
- Can view clients and loans
- Cannot approve/reject loans

## Postman Collection

A complete Postman collection is provided in `postman-collection.json` with all API endpoints and example requests. Import this file into Postman to test the API.

### Usage
1. Open Postman
2. Click Import
3. Select `postman-collection.json`
4. Update the `baseUrl` variable to your API endpoint
5. Run the "Login" request first to get the JWT token
6. The token will be automatically stored in the `token` variable for subsequent requests

## Database Schema

### Entities
- **users**: System users with roles
- **clients**: Client information with credit data
- **loans**: Loan records with status tracking
- **amortization_schedules**: Payment schedules for each loan
- **payments**: Payment records with application details

## Testing

The project includes comprehensive unit tests for all services:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov
```

Test coverage targets:
- Services: >70%
- Controllers: >70%
- Business logic: 100%

## Error Handling

The API uses structured error responses:
```json
{
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/loans",
  "method": "POST",
  "message": "Loan amount exceeds client credit limit",
  "error": "Bad Request"
}
```

## Security Considerations

- Change JWT_SECRET in production
- Use environment variables for sensitive data
- Enable HTTPS in production
- Implement rate limiting for production
- Regular security updates for dependencies

## License

ISC

## Support

For issues and questions, please contact the development team.
