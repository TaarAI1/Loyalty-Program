import { Module } from '@nestjs/common';
import { ConfigurationController } from './configuration.controller';
import { ConfigurationService } from './configuration.service';
import { EncryptionService } from './encryption.service';
import { OracleModule } from '../oracle/oracle.module';

@Module({
  imports:     [OracleModule],
  controllers: [ConfigurationController],
  providers:   [ConfigurationService, EncryptionService],
  exports:     [EncryptionService],
})
export class ConfigurationModule {}
