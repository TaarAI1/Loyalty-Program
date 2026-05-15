import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Headers,
} from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { PointsRulesService, PointsRuleDto } from './points-rules.service';
import { CampaignsService, CampaignDto } from './campaigns.service';

@Controller('configuration')
export class ConfigurationController {
  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly pointsRulesService: PointsRulesService,
    private readonly campaignsService: CampaignsService,
  ) {}

  // ── Tiers ──────────────────────────────────────────────────────────────────

  @Get('loyalty-tiers')
  getTiers() {
    return this.configurationService.getTiers();
  }

  @Put('loyalty-tiers')
  upsertTier(
    @Body()
    body: {
      id?: number;
      name: string;
      pointsFrom: number;
      pointsTo?: number | null;
      spendFrom: number;
      spendTo?: number | null;
      rewardPercentage: number;
      redeemValue?: number;
      benefits?: Record<string, unknown>;
    },
    @Headers('x-changed-by') changedBy?: string,
  ) {
    return this.configurationService.upsertTier(body.id, body, changedBy);
  }

  @Delete('loyalty-tiers/:id')
  deleteTier(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-changed-by') changedBy?: string,
  ) {
    return this.configurationService.deleteTier(id, changedBy);
  }

  // ── WhatsApp ───────────────────────────────────────────────────────────────

  @Get('whatsapp')
  getWhatsAppConfig() {
    return this.configurationService.getWhatsAppConfig();
  }

  @Put('whatsapp')
  updateWhatsAppConfig(
    @Body() body: Record<string, unknown>,
    @Headers('x-changed-by') changedBy?: string,
  ) {
    return this.configurationService.updateWhatsAppConfig(body as Parameters<ConfigurationService['updateWhatsAppConfig']>[0], changedBy);
  }

  @Post('whatsapp/test')
  testWhatsApp(@Body() body: { to: string; template_name: string }) {
    return this.configurationService.testWhatsApp(body.to, body.template_name);
  }

  // ── SMS ────────────────────────────────────────────────────────────────────

  @Get('sms')
  getSmsConfig() {
    return this.configurationService.getSmsConfig();
  }

  @Put('sms')
  updateSmsConfig(
    @Body() body: Record<string, unknown>,
    @Headers('x-changed-by') changedBy?: string,
  ) {
    return this.configurationService.updateSmsConfig(body as Parameters<ConfigurationService['updateSmsConfig']>[0], changedBy);
  }

  // ── Email ──────────────────────────────────────────────────────────────────

  @Get('email')
  getEmailConfig() {
    return this.configurationService.getEmailConfig();
  }

  @Put('email')
  updateEmailConfig(
    @Body() body: Record<string, unknown>,
    @Headers('x-changed-by') changedBy?: string,
  ) {
    return this.configurationService.updateEmailConfig(body as Parameters<ConfigurationService['updateEmailConfig']>[0], changedBy);
  }

  // ── Points Rules ───────────────────────────────────────────────────────────

  @Get('points-rules')
  getPointsRules() {
    return this.pointsRulesService.findAll();
  }

  @Put('points-rules')
  upsertPointsRule(@Body() body: PointsRuleDto & { id?: number }) {
    return this.pointsRulesService.upsert(body.id, body);
  }

  @Delete('points-rules/:id')
  deletePointsRule(@Param('id', ParseIntPipe) id: number) {
    return this.pointsRulesService.delete(id);
  }

  // ── Campaigns ─────────────────────────────────────────────────────────────

  @Get('campaigns')
  getCampaigns() {
    return this.campaignsService.findAll();
  }

  @Post('campaigns')
  createCampaign(@Body() body: CampaignDto) {
    return this.campaignsService.create(body);
  }

  @Put('campaigns/:id')
  updateCampaign(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<CampaignDto>,
  ) {
    return this.campaignsService.update(id, body);
  }

  @Delete('campaigns/:id')
  deleteCampaign(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.delete(id);
  }
}
