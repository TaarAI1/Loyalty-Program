import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { IdempotencyService } from './idempotency.service';
import { PointsService } from './points.service';
import { ConfigurationModule } from '../configuration/configuration.module';

@Module({
  imports: [ConfigurationModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, IdempotencyService, PointsService],
  exports: [PointsService],
})
export class WebhooksModule {}
