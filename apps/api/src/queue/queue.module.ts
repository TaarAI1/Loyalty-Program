import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueService } from './queue.service';
import { QUEUE_WHATSAPP, QUEUE_SMS, QUEUE_EMAIL } from './queue.constants';

export { QUEUE_WHATSAPP, QUEUE_SMS, QUEUE_EMAIL };

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
