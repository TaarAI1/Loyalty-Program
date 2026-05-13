import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
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

  @Get(':id/points-ledger')
  getPointsLedger(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
  ) {
    return this.customersService.getPointsLedger(id, { page, pageSize });
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<{ name: string; email: string; dateOfBirth: string; gender: string; region: string; store: string; isActive: boolean }>,
  ) {
    return this.customersService.update(id, body);
  }

  @Post(':id/notify')
  sendNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { template_name: string; message?: string },
  ) {
    return this.customersService.sendManualWhatsApp(id, body.template_name, body.message);
  }
}
