import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { FormsService } from './forms.service';
import { Public } from '../auth/public.decorator';

@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  // ── Questions ────────────────────────────────────────────────────────────────

  @Get('questions')
  getQuestions() {
    return this.formsService.getQuestions();
  }

  @Post('questions')
  createQuestion(@Body() body: { text: string; questionType: string; options?: string[]; status?: string }) {
    return this.formsService.createQuestion(body);
  }

  @Put('questions/:id')
  updateQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { text?: string; questionType?: string; options?: string[]; status?: string },
  ) {
    return this.formsService.updateQuestion(id, body);
  }

  @Delete('questions/:id')
  deleteQuestion(@Param('id', ParseIntPipe) id: number) {
    return this.formsService.deleteQuestion(id);
  }

  // ── Forms ─────────────────────────────────────────────────────────────────────

  @Get()
  getForms() {
    return this.formsService.getForms();
  }

  @Post()
  createForm(@Body() body: { name: string; questionIds: number[]; status?: string }) {
    return this.formsService.createForm(body);
  }

  @Put(':id')
  updateForm(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; status?: string; questionIds?: number[] },
  ) {
    return this.formsService.updateForm(id, body);
  }

  @Delete(':id')
  deleteForm(@Param('id', ParseIntPipe) id: number) {
    return this.formsService.deleteForm(id);
  }

  // ── Devices ───────────────────────────────────────────────────────────────────

  @Get('devices')
  getDevices(@Query('store') store?: string, @Query('deviceType') deviceType?: string) {
    return this.formsService.getDevices({ store, deviceType });
  }

  @Post('devices')
  createDevice(@Body() body: { name: string; deviceType: string; store?: string }) {
    return this.formsService.createDevice(body);
  }

  @Put('devices/:id')
  updateDevice(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; deviceType?: string; store?: string; isActive?: boolean },
  ) {
    return this.formsService.updateDevice(id, body);
  }

  @Delete('devices/:id')
  deleteDevice(@Param('id', ParseIntPipe) id: number) {
    return this.formsService.deleteDevice(id);
  }

  // ── Assignments ───────────────────────────────────────────────────────────────

  @Get('assignments')
  getAssignments() {
    return this.formsService.getAssignments();
  }

  @Post('assignments')
  assignForm(@Body() body: { formId: number; deviceIds: number[] }) {
    return this.formsService.assignForm(body);
  }

  @Delete('assignments/:id')
  deleteAssignment(@Param('id', ParseIntPipe) id: number) {
    return this.formsService.deleteAssignment(id);
  }

  // ── Kiosk (Public — no API key required) ─────────────────────────────────────

  @Public()
  @Get('kiosk/connect')
  kioskConnect(@Query('code') code: string) {
    return this.formsService.kioskConnect(code);
  }

  @Public()
  @Post('kiosk/submit')
  kioskSubmit(@Body() body: { pairingCode: string; answers: { questionId: number; value: string }[] }) {
    return this.formsService.kioskSubmit(body);
  }
}
