import {
  Controller,
  Post,
  Body,
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
  async processTransaction(@Body() body: Record<string, unknown>) {
    this.logger.log({ transaction_id: body['transaction_id'], store: body['store'] }, 'Webhook transaction received');
    return this.webhooksService.handleTransaction(body as WebhookTransactionDto);
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
