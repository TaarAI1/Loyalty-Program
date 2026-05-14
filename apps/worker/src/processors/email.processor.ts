import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EmailService } from '../services/email.service';
import { EmailJobPayload } from '@loyalty/shared';
import { QUEUE_EMAIL } from './queue.constants';

@Processor(QUEUE_EMAIL)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @Process('send')
  async handleSend(job: Job<EmailJobPayload>) {
    this.logger.log(
      { jobId: job.id, to: job.data.to, subject: job.data.subject, attemptsMade: job.attemptsMade },
      'Processing Email job',
    );

    try {
      await this.emailService.send(job.data);
      this.logger.log({ jobId: job.id, to: job.data.to }, 'Email job completed');
    } catch (err) {
      this.logger.error({ jobId: job.id, to: job.data.to, err }, 'Email job failed');
      throw err;
    }
  }
}
