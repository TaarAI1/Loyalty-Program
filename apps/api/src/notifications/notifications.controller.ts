import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @Query('channel') channel?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize = 50,
  ) {
    return this.notificationsService.findAll({ channel, status, customerId, page, pageSize });
  }

  @Get('stats')
  getStats() {
    return this.notificationsService.getStats();
  }

  @Post(':id/resend')
  resend(@Param('id') id: string) {
    return this.notificationsService.resend(BigInt(id));
  }
}
