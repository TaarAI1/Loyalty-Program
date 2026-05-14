import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { WhatsAppService } from '../services/whatsapp.service';
import { WhatsAppJobPayload } from '@loyalty/shared';
import { QUEUE_WHATSAPP } from './queue.constants';

@Processor(QUEUE_WHATSAPP)
export class WhatsAppProcessor {
  private readonly logger = new Logger(WhatsAppProcessor.name);

  constructor(private readonly whatsappService: WhatsAppService) {}

  @Process('send')
  async handleSend(job: Job<WhatsAppJobPayload>) {
    this.logger.log(
      { jobId: job.id, to: job.data.to, template: job.data.templateName, attemptsMade: job.attemptsMade },
      'Processing WhatsApp job',
    );

    try {
      await this.whatsappService.send(job.data);
      this.logger.log({ jobId: job.id, to: job.data.to }, 'WhatsApp job completed');
    } catch (err) {
      this.logger.error(
        { jobId: job.id, to: job.data.to, attemptsMade: job.attemptsMade, err },
        'WhatsApp job failed',
      );
      throw err;
    }
  }
}
