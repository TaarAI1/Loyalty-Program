import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
    return this.prisma.device.create({ data });
  }

  async updateDevice(id: number, data: { name?: string; deviceType?: string; store?: string; isActive?: boolean }) {
    await this.prisma.device.findFirstOrThrow({ where: { id } });
    return this.prisma.device.update({ where: { id }, data });
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
}
