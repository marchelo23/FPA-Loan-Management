import { IsString, IsNumber, Min, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLoanDto {
  @ApiProperty({ example: 'uuid-of-client' })
  @IsUUID()
  clientId: string;

  @ApiProperty({ example: 5000.00 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(1)
  termMonths: number;

  @ApiProperty({ example: 15.5 })
  @IsNumber()
  @Min(0)
  annualInterestRate: number;
}
