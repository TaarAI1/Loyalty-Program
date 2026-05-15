import { Module } from '@nestjs/common';
import { ConfigurationController } from './configuration.controller';
import { ConfigurationService } from './configuration.service';
import { EncryptionService } from './encryption.service';
import { PointsRulesService } from './points-rules.service';
import { CampaignsService } from './campaigns.service';

@Module({
  controllers: [ConfigurationController],
  providers: [ConfigurationService, EncryptionService, PointsRulesService, CampaignsService],
  exports: [EncryptionService, PointsRulesService, CampaignsService],
})
export class ConfigurationModule {}
