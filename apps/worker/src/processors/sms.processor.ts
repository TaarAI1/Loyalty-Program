import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { SmsService } from '../services/sms.service';
import { SMSJobPayload } from '@loyalty/shared';
import { QUEUE_SMS } from './notification-processors.module';

@Processor(QUEUE_SMS)
export class SmsProcessor {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(private readonly smsService: SmsService) {}

  @Process('send')
  async handleSend(job: Job<SMSJobPayload>) {
    this.logger.log(
      { jobId: job.id, to: job.data.to, attemptsMade: job.attemptsMade },
      'Processing SMS job',
    );

    try {
      await this.smsService.send(job.data);
      this.logger.log({ jobId: job.id, to: job.data.to }, 'SMS job completed');
    } catch (err) {
      this.logger.error({ jobId: job.id, to: job.data.to, err }, 'SMS job failed');
      throw err;
    }
  }
}
