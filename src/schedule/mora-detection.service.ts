import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan, LoanStatus } from '../loans/entities/loan.entity';
import { LoansService } from '../loans/loans.service';

@Injectable()
export class MoraDetectionService {
  private readonly logger = new Logger(MoraDetectionService.name);

  constructor(
    @InjectRepository(Loan)
    private loansRepository: Repository<Loan>,
    private loansService: LoansService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async detectMora(): Promise<void> {
    this.logger.log('Starting daily mora detection job');

    try {
      const activeLoans = await this.loansRepository.find({
        where: [
          { status: LoanStatus.DISBURSED },
          { status: LoanStatus.IN_MORA },
        ],
      });

      this.logger.log(`Found ${activeLoans.length} active loans to check for mora`);

      for (const loan of activeLoans) {
        try {
          await this.loansService.updateLoanStatus(loan.id);
          this.logger.log(`Updated mora status for loan ${loan.id}`);
        } catch (error) {
          this.logger.error(`Failed to update mora status for loan ${loan.id}: ${error.message}`);
        }
      }

      this.logger.log('Daily mora detection job completed');
    } catch (error) {
      this.logger.error(`Mora detection job failed: ${error.message}`);
    }
  }

  async triggerManualMoraDetection(): Promise<{ updated: number; errors: number }> {
    this.logger.log('Starting manual mora detection');

    const activeLoans = await this.loansRepository.find({
      where: [
        { status: LoanStatus.DISBURSED },
        { status: LoanStatus.IN_MORA },
      ],
    });

    let updated = 0;
    let errors = 0;

    for (const loan of activeLoans) {
      try {
        await this.loansService.updateLoanStatus(loan.id);
        updated++;
      } catch (error) {
        this.logger.error(`Failed to update mora status for loan ${loan.id}: ${error.message}`);
        errors++;
      }
    }

    return { updated, errors };
  }
}