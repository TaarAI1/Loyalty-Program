import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WhatsAppProcessor } from './whatsapp.processor';
import { SmsProcessor } from './sms.processor';
import { EmailProcessor } from './email.processor';
import { WhatsAppService } from '../services/whatsapp.service';
import { SmsService } from '../services/sms.service';
import { EmailService } from '../services/email.service';
import { QUEUE_WHATSAPP, QUEUE_SMS, QUEUE_EMAIL } from './queue.constants';

export { QUEUE_WHATSAPP, QUEUE_SMS, QUEUE_EMAIL };

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_WHATSAPP },
      { name: QUEUE_SMS },
      { name: QUEUE_EMAIL },
    ),
  ],
  providers: [
    WhatsAppProcessor,
    SmsProcessor,
    EmailProcessor,
    WhatsAppService,
    SmsService,
    EmailService,
  ],
  exports: [WhatsAppService, SmsService, EmailService],
})
export class NotificationProcessorsModule {}
