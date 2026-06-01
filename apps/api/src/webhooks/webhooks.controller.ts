import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
} from '@nestjs/common';
import { ZodError } from 'zod';
import {
  WebhookCustomerSchema,
  WebhookTransactionSchema,
} from '@loyalty/shared';
import { WebhooksService } from './webhooks.service';

function parseBody<T>(schema: { parse: (data: unknown) => T }, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      const message = err.errors.map((e) => e.message).join('; ');
      throw new BadRequestException(message);
    }
    throw err;
  }
}

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('transaction')
  @HttpCode(200)
  async processTransaction(@Body() body: Record<string, unknown>) {
    this.logger.log({ transaction_id: body['transaction_id'], store: body['store'] }, 'Webhook transaction received');
    const dto = parseBody(WebhookTransactionSchema, body);
    return this.webhooksService.handleTransaction(dto);
  }

  @Post('customer')
  @HttpCode(200)
  async upsertCustomer(
    @Body() body: Record<string, unknown>,
  ) {
    this.logger.log({ mobile: body['mobile'] }, 'Webhook customer upsert received');
    const dto = parseBody(WebhookCustomerSchema, body);
    return this.webhooksService.handleCustomerUpsert(dto);
  }
}
