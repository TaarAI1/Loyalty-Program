import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhookTransactionDto, WebhookCustomerDto } from '@loyalty/shared';
import { Public } from '../auth/public.decorator';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @Post('transaction')
  @HttpCode(200)
  async processTransaction(
    @Body() body: Record<string, unknown>,
    @Headers('x-idempotency-key') idempotencyKey: string,
    @Headers('x-api-key') apiKey: string,
  ) {
    // RetailPro uses its own API key header
    const validKey = process.env.RETAILPRO_WEBHOOK_SECRET;
    if (validKey && apiKey !== validKey) {
      throw new BadRequestException('Invalid webhook secret');
    }

    if (!idempotencyKey) {
      // Generate one from transaction_id if not provided
      idempotencyKey = `retailpro_${body['transaction_id'] as string}`;
    }

    this.logger.log({ idempotencyKey, store: body['store'] }, 'Webhook transaction received');
    return this.webhooksService.handleTransaction(body as WebhookTransactionDto, idempotencyKey);
  }

  @Public()
  @Post('customer')
  @HttpCode(200)
  async upsertCustomer(
    @Body() body: Record<string, unknown>,
    @Headers('x-api-key') apiKey: string,
  ) {
    const validKey = process.env.RETAILPRO_WEBHOOK_SECRET;
    if (validKey && apiKey !== validKey) {
      throw new BadRequestException('Invalid webhook secret');
    }
    this.logger.log({ mobile: body['mobile'] }, 'Webhook customer upsert received');
    return this.webhooksService.handleCustomerUpsert(body as WebhookCustomerDto);
  }
}
