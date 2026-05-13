import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueService } from './queue.service';

export const QUEUE_WHATSAPP = 'notifications.whatsapp';
export const QUEUE_SMS = 'notifications.sms';
export const QUEUE_EMAIL = 'notifications.email';

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_WHATSAPP },
      { name: QUEUE_SMS },
      { name: QUEUE_EMAIL },
    ),
  ],
  providers: [QueueService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
