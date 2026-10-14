import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { PointsService } from './points.service';
import { QueueModule } from '../queue/queue.module';
import { SegmentationModule } from '../segmentation/segmentation.module';

@Module({
  imports: [QueueModule, SegmentationModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, PointsService],
  exports: [PointsService],
})
export class WebhooksModule {}
