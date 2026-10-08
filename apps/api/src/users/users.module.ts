import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigurationModule } from '../configuration/configuration.module';

@Module({
  imports: [PrismaModule, ConfigurationModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
