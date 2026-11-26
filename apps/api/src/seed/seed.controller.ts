import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SeedService } from './seed.service';

@UseGuards(RolesGuard)
@Roles('admin')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get('status')
  status() {
    return this.seedService.getStatus();
  }

  @Post('demo')
  forceDemo() {
    return this.seedService.forceSeedDemo();
  }
}
