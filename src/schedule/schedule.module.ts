import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MoraDetectionService } from './mora-detection.service';
import { LoansModule } from '../loans/loans.module';

@Module({
  imports: [ScheduleModule.forRoot(), LoansModule],
  providers: [MoraDetectionService],
  exports: [MoraDetectionService],
})
export class ScheduleModule {}