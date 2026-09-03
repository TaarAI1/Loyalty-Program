import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function generatePairingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Questions ────────────────────────────────────────────────────────────────

  async getQuestions() {
    return this.prisma.surveyQuestion.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createQuestion(data: { text: string; questionType: string; options?: string[]; status?: string }) {
    return this.prisma.surveyQuestion.create({
      data: {
        text: data.text,
        questionType: data.questionType,
        options: data.options ?? undefined,
        status: data.status ?? 'active',
      },
    });
  }

  async updateQuestion(id: number, data: { text?: string; questionType?: string; options?: string[]; status?: string }) {
    await this.prisma.surveyQuestion.findFirstOrThrow({ where: { id } });
    return this.prisma.surveyQuestion.update({
      where: { id },
      data: {
        ...(data.text !== undefined && { text: data.text }),
        ...(data.questionType !== undefined && { questionType: data.questionType }),
        ...(data.options !== undefined && { options: data.options }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
  }

  async deleteQuestion(id: number) {
    await this.prisma.surveyQuestion.findFirstOrThrow({ where: { id } });
    await this.prisma.surveyQuestion.delete({ where: { id } });
    return { success: true };
  }

  // ── Forms ─────────────────────────────────────────────────────────────────────

  async getForms() {
    return this.prisma.surveyForm.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        formQuestions: {
          include: { question: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async createForm(data: { name: string; questionIds: number[]; status?: string }) {
    return this.prisma.surveyForm.create({
      data: {
        name: data.name,
        status: data.status ?? 'active',
        formQuestions: {
          create: data.questionIds.map((qid, i) => ({
            questionId: qid,
            sortOrder: i,
          })),
        },
      },
      include: { formQuestions: { include: { question: true } } },
    });
  }

  async updateForm(id: number, data: { name?: string; status?: string; questionIds?: number[] }) {
    await this.prisma.surveyForm.findFirstOrThrow({ where: { id } });

    if (data.questionIds !== undefined) {
      await this.prisma.surveyFormQuestion.deleteMany({ where: { formId: id } });
      await this.prisma.surveyFormQuestion.createMany({
        data: data.questionIds.map((qid, i) => ({ formId: id, questionId: qid, sortOrder: i })),
      });
    }

    return this.prisma.surveyForm.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.status !== undefined && { status: data.status }),
      },
      include: { formQuestions: { include: { question: true } } },
    });
  }

  async deleteForm(id: number) {
    await this.prisma.surveyForm.findFirstOrThrow({ where: { id } });
    await this.prisma.surveyFormQuestion.deleteMany({ where: { formId: id } });
    await this.prisma.surveyForm.delete({ where: { id } });
    return { success: true };
  }

  // ── Devices ───────────────────────────────────────────────────────────────────

  async getDevices(filters?: { store?: string; deviceType?: string }) {
    return this.prisma.device.findMany({
      where: {
        ...(filters?.store && { store: filters.store }),
        ...(filters?.deviceType && { deviceType: filters.deviceType }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDevice(data: { name: string; deviceType: string; store?: string }) {
    let pairingCode: string;
    let attempts = 0;
    do {
      pairingCode = generatePairingCode();
      attempts++;
    } while ((await this.prisma.device.findUnique({ where: { pairingCode } })) && attempts < 10);
    return this.prisma.device.create({ data: { ...data, pairingCode } });
  }

  async updateDevice(id: number, data: { name?: string; deviceType?: string; store?: string; isActive?: boolean }) {
    await this.prisma.device.findFirstOrThrow({ where: { id } });
    return this.prisma.device.update({ where: { id }, data });
  }

  async deleteDevice(id: number) {
    await this.prisma.device.findFirstOrThrow({ where: { id } });
    await this.prisma.device.delete({ where: { id } });
    return { success: true };
  }

  // ── Assignments ───────────────────────────────────────────────────────────────

  async getAssignments() {
    return this.prisma.formAssignment.findMany({
      orderBy: { assignedAt: 'desc' },
      include: {
        form: true,
        device: true,
      },
    });
  }

  async assignForm(data: { formId: number; deviceIds: number[] }) {
    const records = await Promise.all(
      data.deviceIds.map((deviceId) =>
        this.prisma.formAssignment.create({
          data: { formId: data.formId, deviceId },
          include: { form: true, device: true },
        }),
      ),
    );
    return { assigned: records.length, records };
  }

  async deleteAssignment(id: number) {
    await this.prisma.formAssignment.findFirstOrThrow({ where: { id } });
    await this.prisma.formAssignment.delete({ where: { id } });
    return { success: true };
  }

  // ── Kiosk ─────────────────────────────────────────────────────────────────────

  async kioskConnect(code: string) {
    const device = await this.prisma.device.findUnique({ where: { pairingCode: code.toUpperCase() } });
    if (!device) throw new NotFoundException('Device not found. Check your pairing code.');

    const assignment = await this.prisma.formAssignment.findFirst({
      where: { deviceId: device.id },
      orderBy: { assignedAt: 'desc' },
      include: {
        form: {
          include: {
            formQuestions: {
              include: { question: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
    if (!assignment) throw new NotFoundException('No form assigned to this device yet.');

    const { form } = assignment;
    return {
      device: { id: device.id, name: device.name, store: device.store, deviceType: device.deviceType },
      form: {
        id: form.id,
        name: form.name,
        questions: form.formQuestions.map((fq) => ({
          id: fq.question.id,
          text: fq.question.text,
          questionType: fq.question.questionType,
          options: fq.question.options ?? null,
          required: true,
        })),
      },
    };
  }

  async kioskSubmit(data: { pairingCode: string; answers: { questionId: number; value: string }[] }) {
    const device = await this.prisma.device.findUnique({ where: { pairingCode: data.pairingCode.toUpperCase() } });
    if (!device) throw new NotFoundException('Device not found.');

    const assignment = await this.prisma.formAssignment.findFirst({
      where: { deviceId: device.id },
      orderBy: { assignedAt: 'desc' },
    });
    if (!assignment) throw new NotFoundException('No form assigned to this device.');

    const response = await this.prisma.formResponse.create({
      data: { deviceId: device.id, formId: assignment.formId, answers: data.answers },
    });
    return { success: true, responseId: response.id };
  }
}
