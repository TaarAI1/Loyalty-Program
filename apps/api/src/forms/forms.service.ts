import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function generatePairingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/** Normalise a Pakistani mobile number to bare 10 digits (3XXXXXXXXX). */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length === 12) return digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) return digits.slice(1);
  return digits;
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

  async kioskLookupCustomer(phone: string) {
    const normalized = normalizePhone(phone);
    // Search all customers and normalize stored mobileNumber for comparison
    const customers = await this.prisma.customer.findMany({
      where: { isActive: true },
      select: { id: true, name: true, mobileNumber: true, countryCode: true },
    });
    const match = customers.find((c) => normalizePhone(c.mobileNumber) === normalized);
    if (!match) throw new NotFoundException('Customer not found in LoyaltyPlus.');
    return { id: match.id, name: match.name, phone: match.mobileNumber };
  }

  async kioskSubmit(data: {
    pairingCode: string;
    customerName?: string;
    customerPhone?: string;
    answers: { questionId: number; value: string }[];
  }) {
    const device = await this.prisma.device.findUnique({ where: { pairingCode: data.pairingCode.toUpperCase() } });
    if (!device) throw new NotFoundException('Device not found.');

    const assignment = await this.prisma.formAssignment.findFirst({
      where: { deviceId: device.id },
      orderBy: { assignedAt: 'desc' },
    });
    if (!assignment) throw new NotFoundException('No form assigned to this device.');

    const response = await this.prisma.formResponse.create({
      data: {
        deviceId: device.id,
        formId: assignment.formId,
        customerName: data.customerName ?? null,
        customerPhone: data.customerPhone ?? null,
        answers: data.answers,
      },
    });
    return { success: true, responseId: response.id };
  }

  async kioskGetResponses() {
    const rows = await this.prisma.formResponse.findMany({
      orderBy: { submittedAt: 'desc' },
      include: {
        form: { select: { id: true, name: true } },
        device: { select: { id: true, name: true, store: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      formName: r.form?.name ?? 'Unknown',
      deviceName: r.device?.name ?? 'Unknown',
      store: r.device?.store ?? null,
      submittedAt: r.submittedAt,
    }));
  }

  async kioskGetResponse(id: number) {
    const r = await this.prisma.formResponse.findUnique({
      where: { id },
      include: {
        form: {
          include: {
            formQuestions: {
              include: { question: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        device: { select: { id: true, name: true, store: true } },
      },
    });
    if (!r) throw new NotFoundException('Response not found.');

    const answers = Array.isArray(r.answers) ? (r.answers as { questionId: number; value: string }[]) : [];
    const questions = r.form?.formQuestions ?? [];

    return {
      id: r.id,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      formName: r.form?.name ?? 'Unknown',
      deviceName: r.device?.name ?? 'Unknown',
      store: r.device?.store ?? null,
      submittedAt: r.submittedAt,
      answers: questions.map((fq) => ({
        question: fq.question.text,
        questionType: fq.question.questionType,
        answer: answers.find((a) => a.questionId === fq.question.id)?.value ?? '',
      })),
    };
  }
}
