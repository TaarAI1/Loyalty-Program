import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  WhatsAppJobPayload,
  SMSJobPayload,
  EmailJobPayload,
} from '@loyalty/shared';
import { QUEUE_WHATSAPP, QUEUE_SMS, QUEUE_EMAIL } from './queue.module';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUE_WHATSAPP) private readonly waQueue: Queue,
    @InjectQueue(QUEUE_SMS) private readonly smsQueue: Queue,
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue,
  ) {}

  async enqueueWhatsApp(payload: WhatsAppJobPayload, opts?: { delay?: number }) {
    const job = await this.waQueue.add('send', payload, {
      delay: opts?.delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    this.logger.log(
      { jobId: job.id, to: payload.to, template: payload.templateName },
      'WhatsApp job enqueued',
    );
    return job.id;
  }

  async enqueueSMS(payload: SMSJobPayload, opts?: { delay?: number }) {
    const job = await this.smsQueue.add('send', payload, {
      delay: opts?.delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    this.logger.log({ jobId: job.id, to: payload.to }, 'SMS job enqueued');
    return job.id;
  }

  async enqueueEmail(payload: EmailJobPayload, opts?: { delay?: number }) {
    const job = await this.emailQueue.add('send', payload, {
      delay: opts?.delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    this.logger.log({ jobId: job.id, to: payload.to }, 'Email job enqueued');
    return job.id;
  }
}
