import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CUSTOMERS = [
  { name: 'Ahmed Ali',       mobile: '3001234567', email: 'ahmed.ali@example.com',       dob: '1985-03-15', gender: 'male',   region: 'South', store: 'Karachi Main' },
  { name: 'Fatima Khan',     mobile: '3011234567', email: 'fatima.khan@example.com',     dob: '1990-07-22', gender: 'female', region: 'Central', store: 'Lahore Gulberg' },
  { name: 'Muhammad Hassan', mobile: '3021234567', email: 'm.hassan@example.com',        dob: '1982-11-08', gender: 'male',   region: 'North', store: 'Islamabad F-10' },
  { name: 'Ayesha Malik',    mobile: '3031234567', email: 'ayesha.malik@example.com',    dob: '1995-01-30', gender: 'female', region: 'South', store: 'Karachi Clifton' },
  { name: 'Omar Sheikh',     mobile: '3041234567', email: 'omar.sheikh@example.com',     dob: '1988-05-18', gender: 'male',   region: 'Central', store: 'Lahore DHA' },
  { name: 'Sara Qureshi',    mobile: '3051234567', email: 'sara.q@example.com',          dob: '1993-09-12', gender: 'female', region: 'North', store: 'Islamabad Blue Area' },
  { name: 'Bilal Ahmed',     mobile: '3061234567', email: 'bilal.ahmed@example.com',     dob: '1987-12-03', gender: 'male',   region: 'South', store: 'Karachi Main' },
  { name: 'Zainab Hussain',  mobile: '3071234567', email: 'zainab.h@example.com',        dob: '1998-04-25', gender: 'female', region: 'Central', store: 'Lahore Gulberg' },
  { name: 'Hamza Iqbal',     mobile: '3081234567', email: 'hamza.iqbal@example.com',     dob: '1991-08-14', gender: 'male',   region: 'North', store: 'Islamabad F-10' },
  { name: 'Nadia Butt',      mobile: '3091234567', email: 'nadia.butt@example.com',      dob: '1986-06-20', gender: 'female', region: 'South', store: 'Karachi Clifton' },
  { name: 'Usman Tariq',     mobile: '3101234567', email: 'usman.tariq@example.com',     dob: '1984-02-11', gender: 'male',   region: 'Central', store: 'Lahore DHA' },
  { name: 'Hina Rizvi',      mobile: '3111234567', email: 'hina.rizvi@example.com',      dob: '1996-10-07', gender: 'female', region: 'North', store: 'Islamabad Blue Area' },
];

// Each entry: [saleAmount, daysAgo]
const TX_TEMPLATES = [
  [12500, 180], [8200, 160], [15000, 140], [6800, 120], [22000, 100],
  [9500, 85],  [18000, 70], [5200, 55],  [31000, 40], [11000, 25],
  [7500, 15],  [24000, 7],  [16000, 3],
];

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async seedIfEmpty() {
    // If seeded data exists but was created with old logic, clear and reseed
    const seedTx = await this.prisma.transaction.findFirst({
      where: { retailproTransactionId: { startsWith: 'TXN-' } },
    });
    if (seedTx) {
      this.logger.log('Clearing old seed data for reseed with corrected point calculation…');
      await this.prisma.pointsExpiry.deleteMany({});
      await this.prisma.pointsLedger.deleteMany({});
      await this.prisma.transaction.deleteMany({ where: { retailproTransactionId: { startsWith: 'TXN-' } } });
      await this.prisma.customer.deleteMany({ where: { retailproId: { startsWith: 'RP-' } } });
    }

    const count = await this.prisma.customer.count();
    if (count > 0) return;

    this.logger.log('Seeding test data…');

    const tiers = await this.prisma.loyaltyTier.findMany({ orderBy: { spendFrom: 'asc' } });
    if (tiers.length === 0) {
      this.logger.warn('No tiers found, skipping customer seed');
      return;
    }

    // Match real system: tier determined by lifetime spend (spendFrom/spendTo)
    const getTierBySpend = (spend: number) =>
      [...tiers]
        .reverse()
        .find((t) => Number(t.spendFrom) <= spend) ?? tiers[0];

    // rewardPercentage stored as e.g. 4.00 meaning 4% → use as-is in formula /100
    const getRewardPct = (tier: { rewardPercentage: unknown }) =>
      Number(tier.rewardPercentage);

    for (let i = 0; i < CUSTOMERS.length; i++) {
      const c = CUSTOMERS[i];
      const txSlice = TX_TEMPLATES.slice(0, 5 + (i % 5));

      let totalPoints = 0;
      let lifetimeSale = 0;

      // Calculate totals using spend-based tier (matching real webhook logic)
      for (const [amount] of txSlice) {
        const tierAtTime = getTierBySpend(lifetimeSale);
        const pts = Math.round((Number(amount) * getRewardPct(tierAtTime)) / 100);
        totalPoints += pts;
        lifetimeSale += Number(amount);
      }

      const finalTier = getTierBySpend(lifetimeSale);

      const customer = await this.prisma.customer.create({
        data: {
          retailproId: `RP-${1000 + i}`,
          name: c.name,
          mobileNumber: c.mobile,
          countryCode: '92',
          email: c.email,
          dateOfBirth: new Date(c.dob),
          gender: c.gender,
          region: c.region,
          store: c.store,
          tierId: finalTier.id,
          totalPoints,
          lifetimePoints: totalPoints,
          lifetimeSale: lifetimeSale,
          lastVisitDate: this.daysAgo(3),
          isActive: true,
        },
      });

      let runningBalance = 0;
      let runningSpend = 0;
      for (let j = 0; j < txSlice.length; j++) {
        const [amount, daysAgo] = txSlice[j];
        const tierAtTime = getTierBySpend(runningSpend);
        const pts = Math.round((Number(amount) * getRewardPct(tierAtTime)) / 100);
        runningBalance += pts;
        runningSpend += Number(amount);

        const txDate = this.daysAgo(daysAgo as number);
        const tx = await this.prisma.transaction.create({
          data: {
            retailproTransactionId: `TXN-${Date.now()}-${i}-${j}`,
            customerId: customer.id,
            transactionDate: txDate,
            saleAmount: amount as number,
            pointsEarned: pts,
            pointsRedeemed: 0,
            redemptionAmount: 0,
            receiptNo: `REC-${10000 + i * 20 + j}`,
            store: c.store,
            region: c.region,
            status: 'completed',
          },
        });

        await this.prisma.pointsLedger.create({
          data: {
            customerId: customer.id,
            transactionId: tx.id,
            pointsChange: pts,
            runningBalance,
            reason: 'purchase',
            referenceId: tx.id,
            createdAt: txDate,
          },
        });

        const expiryDate = new Date(txDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        await this.prisma.pointsExpiry.create({
          data: {
            customerId: customer.id,
            pointsAmount: pts,
            earningDate: txDate,
            expiryDate,
            isExpired: false,
          },
        });
      }

      this.logger.log(`Seeded customer: ${c.name} (${finalTier.name}, ${totalPoints} pts)`);
    }

    this.logger.log('Test data seeded successfully');
  }

  private daysAgo(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }
}
