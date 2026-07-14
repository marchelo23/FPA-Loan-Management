import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SimulateLoanDto {
  @ApiProperty({ example: 5000.00 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 15.5 })
  @IsNumber()
  @Min(0)
  annualInterestRate: number;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(1)
  termMonths: number;
}
