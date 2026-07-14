import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('overdue-portfolio')
  @Roles(UserRole.ADMIN, UserRole.CREDIT_ANALYST)
  @ApiOperation({ summary: 'Get overdue portfolio report grouped by days overdue' })
  @ApiResponse({ status: 200, description: 'Overdue portfolio report retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getOverduePortfolio() {
    return this.reportsService.getOverduePortfolio();
  }

  @Get('portfolio-summary')
  @Roles(UserRole.ADMIN, UserRole.CREDIT_ANALYST)
  @ApiOperation({ summary: 'Get portfolio summary' })
  @ApiResponse({ status: 200, description: 'Portfolio summary retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getPortfolioSummary() {
    return this.reportsService.getPortfolioSummary();
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: 'Get client portfolio' })
  @ApiResponse({ status: 200, description: 'Client portfolio retrieved successfully' })
  async getClientPortfolio(@Param('clientId') clientId: string) {
    return this.reportsService.getClientPortfolio(clientId);
  }

  @Get('payment-history/:loanId')
  @ApiOperation({ summary: 'Get payment history for a loan' })
  @ApiResponse({ status: 200, description: 'Payment history retrieved successfully' })
  async getPaymentHistory(@Param('loanId') loanId: string) {
    return this.reportsService.getPaymentHistory(loanId);
  }
}
