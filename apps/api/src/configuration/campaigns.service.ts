import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CampaignDto {
  name: string;
  description?: string;
  multiplier: number;
  startDate: string;
  endDate: string;
  targetTierId?: number | null;
  isActive: boolean;
}

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get camp(): any { return (this.prisma as any).campaign; }

  findAll() {
    return this.camp.findMany({
      include: { targetTier: { select: { id: true, name: true } } },
      orderBy: { startDate: 'desc' },
    });
  }

  async create(dto: CampaignDto) {
    return this.camp.create({
      data: {
        name: dto.name,
        description: dto.description,
        multiplier: dto.multiplier,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        targetTierId: dto.targetTierId ?? null,
        isActive: dto.isActive,
      },
      include: { targetTier: { select: { id: true, name: true } } },
    });
  }

  async update(id: number, dto: Partial<CampaignDto>) {
    const exists = await this.camp.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Campaign not found');
    return this.camp.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: { targetTier: { select: { id: true, name: true } } },
    });
  }

  delete(id: number) {
    return this.camp.delete({ where: { id } });
  }

  /** Returns the highest multiplier for an active campaign at given tierId */
  async getActiveMultiplier(tierId?: number | null): Promise<number> {
    const now = new Date();
    const campaign = await this.camp.findFirst({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        OR: [{ targetTierId: null }, { targetTierId: tierId ?? undefined }],
      },
      orderBy: { multiplier: 'desc' },
    });
    return campaign ? Number(campaign.multiplier) : 1;
  }
}
