import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { CustomerUpdateSchema } from '@loyalty/shared';
import { CustomersService } from './customers.service';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('tierId', new DefaultValuePipe(0), ParseIntPipe) tierId?: number,
    @Query('region') region?: string,
    @Query('store') store?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize = 50,
  ) {
    return this.customersService.findAll({
      search,
      tierId: tierId || undefined,
      region,
      store,
      page,
      pageSize,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.findOne(id);
  }

  @Get(':id/history')
  getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
  ) {
    return this.customersService.getTransactionHistory(id, { page, pageSize });
  }

  @Get(':id/transactions/:txId/items')
  getTransactionItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('txId', ParseUUIDPipe) txId: string,
  ) {
    return this.customersService.getTransactionItems(id, txId);
  }

  @Get(':id/points-ledger')
  getPointsLedger(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
  ) {
    return this.customersService.getPointsLedger(id, { page, pageSize });
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    try {
      const data = CustomerUpdateSchema.parse(body);
      return this.customersService.update(id, data);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException(err.errors.map((e) => e.message).join('; '));
      }
      throw err;
    }
  }

  @Post(':id/notify')
  sendNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { template_name: string; message?: string },
  ) {
    return this.customersService.sendManualWhatsApp(id, body.template_name, body.message);
  }

  @Post(':id/award-points')
  awardPoints(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { points: number; reason: string; awardedBy?: string },
  ) {
    return this.customersService.awardPoints(id, body.points, body.reason, body.awardedBy ?? 'admin');
  }
}
