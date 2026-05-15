import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PointsRuleDto {
  type: string;
  name: string;
  value: number;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

@Injectable()
export class PointsRulesService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get pr(): any { return (this.prisma as any).pointsRule; }

  findAll() {
    return this.pr.findMany({ orderBy: { type: 'asc' } });
  }

  async upsert(id: number | undefined, dto: PointsRuleDto) {
    const data = {
      type: dto.type,
      name: dto.name,
      value: dto.value,
      isActive: dto.isActive,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    };
    if (id) {
      return this.pr.update({ where: { id }, data });
    }
    return this.pr.create({ data });
  }

  delete(id: number) {
    return this.pr.delete({ where: { id } });
  }

  /** Get active rule value by type (returns null if not active) */
  async getActiveValue(type: string): Promise<number | null> {
    const now = new Date();
    const rule = await this.pr.findFirst({
      where: {
        type,
        isActive: true,
        OR: [
          { startDate: null },
          { startDate: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
          },
        ],
      },
    });
    return rule ? Number(rule.value) : null;
  }
}
