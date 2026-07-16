import { Module } from '@nestjs/common';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Loan } from '../loans/entities/loan.entity';
import { MoraDetectionService } from './mora-detection.service';
import { LoansModule } from '../loans/loans.module';

@Module({
  imports: [NestScheduleModule.forRoot(), LoansModule, TypeOrmModule.forFeature([Loan])],
  providers: [MoraDetectionService],
  exports: [MoraDetectionService],
})
export class ScheduleModule {}