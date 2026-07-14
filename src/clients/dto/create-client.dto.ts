import { IsString, IsEmail, IsInt, IsDate, IsOptional, Min, Max, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ example: '123456789' })
  @IsString()
  identificationNumber: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  phone: string;

  @ApiProperty({ example: '1990-01-01', required: false })
  @IsOptional()
  @IsDate()
  birthDate?: Date;

  @ApiProperty({ example: '123 Main St, City' })
  @IsString()
  address: string;

  @ApiProperty({ example: 750, minimum: 300, maximum: 850 })
  @IsInt()
  @Min(300)
  @Max(850)
  creditScore: number;

  @ApiProperty({ example: 10000.00 })
  @IsNumber()
  @Min(0)
  creditLimit: number;
}
