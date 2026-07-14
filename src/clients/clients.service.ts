import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
  ) {}

  async create(createClientDto: any): Promise<Client> {
    const existingClientById = await this.clientsRepository.findOne({
      where: { identificationNumber: createClientDto.identificationNumber },
    });

    if (existingClientById) {
      throw new ConflictException('Identification number already exists');
    }

    const existingClientByEmail = await this.clientsRepository.findOne({
      where: { email: createClientDto.email },
    });

    if (existingClientByEmail) {
      throw new ConflictException('Email already exists');
    }

    const client = this.clientsRepository.create(createClientDto);
    const savedClient = await this.clientsRepository.save(client);
    return Array.isArray(savedClient) ? savedClient[0] : savedClient;
  }

  async findAll(): Promise<Client[]> {
    return this.clientsRepository.find({ where: { isActive: true } });
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.clientsRepository.findOne({ where: { id } });
    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }
    return client;
  }

  async findByIdentificationNumber(identificationNumber: string): Promise<Client> {
    const client = await this.clientsRepository.findOne({
      where: { identificationNumber },
    });
    if (!client) {
      throw new NotFoundException(`Client with identification number ${identificationNumber} not found`);
    }
    return client;
  }

  async update(id: string, updateClientDto: any): Promise<Client> {
    const client = await this.findOne(id);

    if (updateClientDto.identificationNumber && updateClientDto.identificationNumber !== client.identificationNumber) {
      const existing = await this.clientsRepository.findOne({
        where: { identificationNumber: updateClientDto.identificationNumber },
      });
      if (existing) {
        throw new ConflictException('Identification number already exists');
      }
    }

    if (updateClientDto.email && updateClientDto.email !== client.email) {
      const existing = await this.clientsRepository.findOne({
        where: { email: updateClientDto.email },
      });
      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    Object.assign(client, updateClientDto);
    return this.clientsRepository.save(client);
  }

  async remove(id: string): Promise<void> {
    const client = await this.findOne(id);
    client.isActive = false;
    await this.clientsRepository.save(client);
  }

  async updateCreditScore(id: string, creditScore: number): Promise<Client> {
    const client = await this.findOne(id);
    client.creditScore = creditScore;
    return this.clientsRepository.save(client);
  }

  async updateCreditLimit(id: string, creditLimit: number): Promise<Client> {
    const client = await this.findOne(id);
    client.creditLimit = creditLimit;
    return this.clientsRepository.save(client);
  }
}
