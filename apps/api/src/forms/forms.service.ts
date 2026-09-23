import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

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
    // DB link (SurveyFormQuestion) is intentionally kept intact so that
    // re-activating a question restores it to all its forms automatically.
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

  async createForm(data: { name: string; questionIds: number[]; status?: string; formType?: string }) {
    const formType = data.formType ?? 'kiosk';

    // For web forms: generate a unique token; deactivate other active web forms
    let webToken: string | undefined;
    if (formType === 'web') {
      webToken = randomUUID();
      await this.prisma.surveyForm.updateMany({
        where: { formType: 'web', status: 'active' },
        data: { status: 'inactive' },
      });
    }

    return this.prisma.surveyForm.create({
      data: {
        name: data.name,
        status: data.status ?? 'active',
        formType,
        webToken: webToken ?? null,
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
    const existing = await this.prisma.surveyForm.findFirstOrThrow({ where: { id } });

    // If activating a web form, deactivate all other active web forms first
    if (data.status === 'active' && existing.formType === 'web') {
      await this.prisma.surveyForm.updateMany({
        where: { formType: 'web', status: 'active', id: { not: id } },
        data: { status: 'inactive' },
      });
    }

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

  // ── Web Form (public) ─────────────────────────────────────────────────────────

  /** Return the active web form by its token (for the public survey page). */
  async getWebForm(token: string) {
    const form = await this.prisma.surveyForm.findUnique({
      where: { webToken: token },
      include: {
        formQuestions: {
          include: { question: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!form) throw new NotFoundException('Survey not found.');

    return {
      id: form.id,
      name: form.name,
      status: form.status,
      questions: form.formQuestions
        .filter((fq) => fq.question.status === 'active')
        .map((fq) => ({
          id: fq.question.id,
          text: fq.question.text,
          questionType: fq.question.questionType,
          options: fq.question.options ?? null,
          required: true,
        })),
    };
  }

  /** Save a web form response (no device required). */
  async submitWebResponse(data: {
    token: string;
    customerName?: string;
    customerPhone?: string;
    answers: { questionId: number; value: string }[];
  }) {
    const form = await this.prisma.surveyForm.findUnique({ where: { webToken: data.token } });
    if (!form) throw new NotFoundException('Survey not found.');

    return this.prisma.formResponse.create({
      data: {
        formId: form.id,
        deviceId: null,
        customerName: data.customerName ?? null,
        customerPhone: data.customerPhone ?? null,
        answers: data.answers,
      },
    });
  }

  /** Return the active web form token (used by WhatsApp receipt to append the survey link). */
  async getActiveWebForm() {
    return this.prisma.surveyForm.findFirst({
      where: { formType: 'web', status: 'active' },
      select: { id: true, webToken: true, name: true },
    });
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
    const TYPE_ORDER: Record<string, number> = { rating: 0, textarea: 1, boolean: 2, select: 3, text: 4 };
    return {
      device: { id: device.id, name: device.name, store: device.store, deviceType: device.deviceType },
      form: {
        id: form.id,
        name: form.name,
        questions: form.formQuestions
          .filter((fq) => fq.question.status === 'active')
          .slice()
          .sort((a, b) => (TYPE_ORDER[a.question.questionType] ?? 99) - (TYPE_ORDER[b.question.questionType] ?? 99))
          .map((fq) => ({
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

  async kioskStatus(code: string) {
    const device = await this.prisma.device.findUnique({
      where: { pairingCode: code.toUpperCase() },
    });
    if (!device) return { connected: false };
    const assignment = await this.prisma.formAssignment.findFirst({
      where: { deviceId: device.id },
    });
    return { connected: assignment != null };
  }

  async kioskGetResponses(phone?: string, tierId?: string) {
    let where: Record<string, unknown> = phone ? { customerPhone: { contains: phone } } : {};

    if (tierId) {
      const customers = await this.prisma.customer.findMany({
        where: { tierId: Number(tierId) },
        select: { mobileNumber: true },
      });
      const phones = customers.map((c) => c.mobileNumber);
      where = { ...where, customerPhone: { in: phones } };
    }

    const rows = await this.prisma.formResponse.findMany({
      orderBy: { submittedAt: 'desc' },
      where,
      include: {
        form: { select: { id: true, name: true } },
        device: { select: { id: true, name: true, store: true } },
      },
    });
    return rows
      // Responses are kept even when form/device is deleted (FK set to null) — show with fallback labels
      .map((r) => ({
        id: r.id,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        formName:   r.form?.name   ?? 'Deleted Form',
        deviceName: r.device?.name ?? 'Deleted Device',
        store:      r.device?.store ?? null,
        submittedAt: r.submittedAt,
      }));
  }

  // ── Kiosk pending survey (push from POS, poll from tablet) ──────────────────

  async kioskPushSurvey(deviceCode: string, customerName?: string, customerPhone?: string) {
    const device = await this.prisma.device.findUnique({ where: { pairingCode: deviceCode.toUpperCase() } });
    if (!device) throw new NotFoundException('Device not found. Check the kiosk device code.');
    await this.prisma.pendingSurvey.create({
      data: { deviceId: device.id, customerName: customerName ?? null, customerPhone: customerPhone ?? null },
    });
    return { success: true };
  }

  async kioskPollSurvey(code: string) {
    const device = await this.prisma.device.findUnique({ where: { pairingCode: code.toUpperCase() } });
    if (!device) return null;
    const survey = await this.prisma.pendingSurvey.findFirst({
      where: { deviceId: device.id },
      orderBy: { createdAt: 'asc' },
    });
    if (!survey) return null;
    await this.prisma.pendingSurvey.delete({ where: { id: survey.id } });
    return { customerName: survey.customerName, customerPhone: survey.customerPhone };
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
      formName: r.form?.name ?? 'Deleted Form',
      deviceName: r.device?.name ?? 'Deleted Device',
      store: r.device?.store ?? null,
      submittedAt: r.submittedAt,
      answers: questions.map((fq) => ({
        question: fq.question.text,
        questionType: fq.question.questionType,
        answer: answers.find((a) => Number(a.questionId) === fq.question.id)?.value ?? '',
      })),
    };
  }
}
