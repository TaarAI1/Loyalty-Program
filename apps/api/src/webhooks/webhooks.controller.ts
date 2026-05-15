import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhookTransactionDto, WebhookCustomerDto } from '@loyalty/shared';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('transaction')
  @HttpCode(200)
  async processTransaction(
    @Body() body: Record<string, unknown>,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      idempotencyKey = `retailpro_${body['transaction_id'] as string}`;
    }

    this.logger.log({ idempotencyKey, store: body['store'] }, 'Webhook transaction received');
    return this.webhooksService.handleTransaction(body as WebhookTransactionDto, idempotencyKey);
  }

  @Post('customer')
  @HttpCode(200)
  async upsertCustomer(
    @Body() body: Record<string, unknown>,
  ) {
    this.logger.log({ mobile: body['mobile'] }, 'Webhook customer upsert received');
    return this.webhooksService.handleCustomerUpsert(body as WebhookCustomerDto);
  }
}
