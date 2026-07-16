import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { LoansService } from './loans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateLoanDto } from './dto/create-loan.dto';
import { SimulateLoanDto } from './dto/simulate-loan.dto';

@ApiTags('loans')
@Controller('loans')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LoansController {
  constructor(private loansService: LoansService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.CREDIT_ANALYST)
  @ApiOperation({ summary: 'Create a new loan request' })
  @ApiResponse({ status: 201, description: 'Loan request created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() createLoanDto: CreateLoanDto, @Request() req) {
    return this.loansService.create(createLoanDto, req.user.id);
  }

  @Post('simulate')
  @ApiOperation({ summary: 'Simulate a loan calculation' })
  @ApiResponse({ status: 200, description: 'Loan simulation completed' })
  async simulate(@Body() simulateLoanDto: SimulateLoanDto) {
    return this.loansService.simulateLoan(simulateLoanDto.amount, simulateLoanDto.annualInterestRate, simulateLoanDto.termMonths);
  }

  @Get()
  @ApiOperation({ summary: 'Get all loans' })
  @ApiResponse({ status: 200, description: 'Loans retrieved successfully' })
  async findAll() {
    return this.loansService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a loan by ID' })
  @ApiResponse({ status: 200, description: 'Loan retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  async findOne(@Param('id') id: string) {
    return this.loansService.findOne(id);
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: 'Get all loans for a client' })
  @ApiResponse({ status: 200, description: 'Client loans retrieved successfully' })
  async findByClient(@Param('clientId') clientId: string) {
    return this.loansService.findByClient(clientId);
  }

  @Put(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.CREDIT_ANALYST)
  @ApiOperation({ summary: 'Approve a loan' })
  @ApiResponse({ status: 200, description: 'Loan approved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async approve(@Param('id') id: string, @Request() req) {
    return this.loansService.approve(id, req.user.id);
  }

  @Put(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.CREDIT_ANALYST)
  @ApiOperation({ summary: 'Reject a loan' })
  @ApiResponse({ status: 200, description: 'Loan rejected successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async reject(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.loansService.reject(id, body.reason);
  }

  @Put(':id/disburse')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Disburse a loan' })
  @ApiResponse({ status: 200, description: 'Loan disbursed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async disburse(@Param('id') id: string) {
    return this.loansService.disburse(id);
  }

  @Put(':id/update-status')
  @Roles(UserRole.ADMIN, UserRole.CREDIT_ANALYST)
  @ApiOperation({ summary: 'Update loan status (check for overdue payments)' })
  @ApiResponse({ status: 200, description: 'Loan status updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateStatus(@Param('id') id: string) {
    return this.loansService.updateLoanStatus(id);
  }

  @Get(':id/late-interest')
  @Roles(UserRole.ADMIN, UserRole.CREDIT_ANALYST)
  @ApiOperation({ summary: 'Calculate late interest for a loan' })
  @ApiResponse({ status: 200, description: 'Late interest calculated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async calculateLateInterest(@Param('id') id: string) {
    return { lateInterest: await this.loansService.calculateLateInterest(id) };
  }
}
