import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('clients')
@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.CREDIT_ANALYST)
  @ApiOperation({ summary: 'Create a new client' })
  @ApiResponse({ status: 201, description: 'Client successfully created' })
  @ApiResponse({ status: 409, description: 'Client already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active clients' })
  @ApiResponse({ status: 200, description: 'Clients retrieved successfully' })
  async findAll() {
    return this.clientsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a client by ID' })
  @ApiResponse({ status: 200, description: 'Client retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Get('identification/:identificationNumber')
  @ApiOperation({ summary: 'Get a client by identification number' })
  @ApiResponse({ status: 200, description: 'Client retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async findByIdentificationNumber(@Param('identificationNumber') identificationNumber: string) {
    return this.clientsService.findByIdentificationNumber(identificationNumber);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.CREDIT_ANALYST)
  @ApiOperation({ summary: 'Update a client' })
  @ApiResponse({ status: 200, description: 'Client successfully updated' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate a client' })
  @ApiResponse({ status: 200, description: 'Client successfully deactivated' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }

  @Put(':id/credit-score')
  @Roles(UserRole.ADMIN, UserRole.CREDIT_ANALYST)
  @ApiOperation({ summary: 'Update client credit score' })
  @ApiResponse({ status: 200, description: 'Credit score successfully updated' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateCreditScore(@Param('id') id: string, @Body() body: { creditScore: number }) {
    return this.clientsService.updateCreditScore(id, body.creditScore);
  }

  @Put(':id/credit-limit')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update client credit limit' })
  @ApiResponse({ status: 200, description: 'Credit limit successfully updated' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateCreditLimit(@Param('id') id: string, @Body() body: { creditLimit: number }) {
    return this.clientsService.updateCreditLimit(id, body.creditLimit);
  }
}
