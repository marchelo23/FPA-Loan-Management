import { IsString, IsNumber, Min, IsUUID, IsOptional, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ example: 'uuid-of-loan' })
  @IsUUID()
  loanId: string;

  @ApiProperty({ example: 500.00 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: '2024-01-15', required: false })
  @IsOptional()
  @IsDate()
  paymentDate?: Date;

  @ApiProperty({ example: 'Payment for January installment', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
