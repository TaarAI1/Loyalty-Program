import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CUSTOMERS = [
  { name: 'Ahmed Ali',       mobile: '3001234567', email: 'ahmed.ali@example.com',       dob: '1985-03-15', gender: 'male',   region: 'South',   store: 'Karachi Main',        city: 'Karachi',    area: 'Saddar',     occupation: 'Business Owner',  maritalStatus: 'married', preferredChannel: 'whatsapp', segment: 'loyal' },
  { name: 'Fatima Khan',     mobile: '3011234567', email: 'fatima.khan@example.com',     dob: '1990-07-22', gender: 'female', region: 'Central', store: 'Lahore Gulberg',     city: 'Lahore',     area: 'Gulberg',    occupation: 'Doctor',          maritalStatus: 'married', preferredChannel: 'email',    segment: 'loyal' },
  { name: 'Muhammad Hassan', mobile: '3021234567', email: 'm.hassan@example.com',        dob: '1982-11-08', gender: 'male',   region: 'North',   store: 'Islamabad F-10',      city: 'Islamabad',  area: 'F-10',       occupation: 'Engineer',        maritalStatus: 'married', preferredChannel: 'sms',      segment: 'at_risk' },
  { name: 'Ayesha Malik',    mobile: '3031234567', email: 'ayesha.malik@example.com',    dob: '1995-01-30', gender: 'female', region: 'South',   store: 'Karachi Clifton',     city: 'Karachi',    area: 'Clifton',    occupation: 'Designer',        maritalStatus: 'single',  preferredChannel: 'whatsapp', segment: 'new' },
  { name: 'Omar Sheikh',     mobile: '3041234567', email: 'omar.sheikh@example.com',     dob: '1988-05-18', gender: 'male',   region: 'Central', store: 'Lahore DHA',          city: 'Lahore',     area: 'DHA Phase 5', occupation: 'Banker',         maritalStatus: 'married', preferredChannel: 'email',    segment: 'loyal' },
  { name: 'Sara Qureshi',    mobile: '3051234567', email: 'sara.q@example.com',          dob: '1993-09-12', gender: 'female', region: 'North',   store: 'Islamabad Blue Area', city: 'Islamabad',  area: 'Blue Area',  occupation: 'Teacher',         maritalStatus: 'single',  preferredChannel: 'whatsapp', segment: 'occasional' },
  { name: 'Bilal Ahmed',     mobile: '3061234567', email: 'bilal.ahmed@example.com',     dob: '1987-12-03', gender: 'male',   region: 'South',   store: 'Karachi Main',        city: 'Karachi',    area: 'PECHS',      occupation: 'Lawyer',          maritalStatus: 'married', preferredChannel: 'sms',      segment: 'loyal' },
  { name: 'Zainab Hussain',  mobile: '3071234567', email: 'zainab.h@example.com',        dob: '1998-04-25', gender: 'female', region: 'Central', store: 'Lahore Gulberg',     city: 'Lahore',     area: 'Johar Town', occupation: 'Student',         maritalStatus: 'single',  preferredChannel: 'whatsapp', segment: 'new' },
  { name: 'Hamza Iqbal',     mobile: '3081234567', email: 'hamza.iqbal@example.com',     dob: '1991-08-14', gender: 'male',   region: 'North',   store: 'Islamabad F-10',      city: 'Islamabad',  area: 'F-7',        occupation: 'IT Consultant',   maritalStatus: 'single',  preferredChannel: 'email',    segment: 'occasional' },
  { name: 'Nadia Butt',      mobile: '3091234567', email: 'nadia.butt@example.com',      dob: '1986-06-20', gender: 'female', region: 'South',   store: 'Karachi Clifton',     city: 'Karachi',    area: 'Defence',    occupation: 'Pharmacist',      maritalStatus: 'married', preferredChannel: 'whatsapp', segment: 'loyal' },
  { name: 'Usman Tariq',     mobile: '3101234567', email: 'usman.tariq@example.com',     dob: '1984-02-11', gender: 'male',   region: 'Central', store: 'Lahore DHA',          city: 'Lahore',     area: 'Model Town', occupation: 'Accountant',      maritalStatus: 'married', preferredChannel: 'sms',      segment: 'at_risk' },
  { name: 'Hina Rizvi',      mobile: '3111234567', email: 'hina.rizvi@example.com',      dob: '1996-10-07', gender: 'female', region: 'North',   store: 'Islamabad Blue Area', city: 'Islamabad',  area: 'G-11',       occupation: 'Marketing',       maritalStatus: 'single',  preferredChannel: 'whatsapp', segment: 'new' },
  { name: 'Kamran Javed',    mobile: '3121234568', email: 'kamran.javed@example.com',    dob: '1979-09-01', gender: 'male',   region: 'South',   store: 'Karachi Main',        city: 'Karachi',    area: 'North Nazimabad', occupation: 'Importer',   maritalStatus: 'married', preferredChannel: 'email',    segment: 'champion' },
  { name: 'Sana Mir',        mobile: '3131234568', email: 'sana.mir@example.com',        dob: '1992-12-19', gender: 'female', region: 'Central', store: 'Lahore Gulberg',     city: 'Lahore',     area: 'Cantt',      occupation: 'Architect',       maritalStatus: 'married', preferredChannel: 'whatsapp', segment: 'loyal' },
  { name: 'Ali Raza',        mobile: '3141234568', email: 'ali.raza@example.com',        dob: '1994-03-28', gender: 'male',   region: 'North',   store: 'Islamabad F-10',      city: 'Rawalpindi', area: 'Saddar',     occupation: 'Sales Manager',   maritalStatus: 'single',  preferredChannel: 'sms',      segment: 'occasional' },
  { name: 'Mehwish Noor',    mobile: '3151234568', email: 'mehwish.noor@example.com',    dob: '1989-05-05', gender: 'female', region: 'South',   store: 'Karachi Clifton',     city: 'Karachi',    area: 'Bahadurabad', occupation: 'HR Manager',     maritalStatus: 'married', preferredChannel: 'email',    segment: 'loyal' },
  { name: 'Tariq Mehmood',   mobile: '3161234568', email: 'tariq.mehmood@example.com',   dob: '1980-08-16', gender: 'male',   region: 'Central', store: 'Lahore DHA',          city: 'Lahore',     area: 'Wapda Town', occupation: 'Contractor',      maritalStatus: 'married', preferredChannel: 'whatsapp', segment: 'champion' },
  { name: 'Rabia Saeed',     mobile: '3171234568', email: 'rabia.saeed@example.com',     dob: '1997-11-23', gender: 'female', region: 'North',   store: 'Islamabad Blue Area', city: 'Islamabad',  area: 'Bahria',     occupation: 'Content Creator', maritalStatus: 'single',  preferredChannel: 'whatsapp', segment: 'new' },
  { name: 'Faisal Anwar',    mobile: '3181234568', email: 'faisal.anwar@example.com',    dob: '1983-01-09', gender: 'male',   region: 'South',   store: 'Karachi Main',        city: 'Hyderabad',  area: 'Latifabad',  occupation: 'Shop Owner',      maritalStatus: 'married', preferredChannel: 'sms',      segment: 'occasional' },
  { name: 'Iqra Shah',       mobile: '3191234568', email: 'iqra.shah@example.com',       dob: '1999-06-14', gender: 'female', region: 'Central', store: 'Lahore Gulberg',     city: 'Lahore',     area: 'Garden Town', occupation: 'Intern',         maritalStatus: 'single',  preferredChannel: 'whatsapp', segment: 'new' },
];

// Each entry: [saleAmount, daysAgo]
const TX_TEMPLATES = [
  [12500, 180], [8200, 160], [15000, 140], [6800, 120], [22000, 100],
  [9500, 85],  [18000, 70], [5200, 55],  [31000, 40], [11000, 25],
  [7500, 15],  [24000, 7],  [16000, 3], [45000, 2], [8900, 1],
];

const PRODUCTS = [
  { sku: 'SHIRT-001', description: 'Cotton Formal Shirt', unitPrice: 4500 },
  { sku: 'PANT-002', description: 'Slim Fit Chinos', unitPrice: 5200 },
  { sku: 'JACKET-003', description: 'Wool Blend Blazer', unitPrice: 18500 },
  { sku: 'SHOES-004', description: 'Leather Oxford Shoes', unitPrice: 9800 },
  { sku: 'WATCH-005', description: 'Classic Analog Watch', unitPrice: 12500 },
  { sku: 'BAG-006', description: 'Leather Messenger Bag', unitPrice: 7200 },
  { sku: 'PERF-007', description: 'Eau de Parfum 100ml', unitPrice: 6500 },
  { sku: 'TIE-008', description: 'Silk Neck Tie', unitPrice: 2200 },
  { sku: 'BELT-009', description: 'Genuine Leather Belt', unitPrice: 2800 },
  { sku: 'HOOD-010', description: 'Premium Hoodie', unitPrice: 5500 },
];

const DEFAULT_TIERS = [
  {
    name: 'Classic',
    pointsFrom: 0,
    pointsTo: 2000,
    spendFrom: 1,
    spendTo: 50001,
    rewardPercentage: 4,
    benefits: {
      description: 'Welcome tier with 4% points reward',
      perks: ['Birthday discount', 'Points on every purchase'],
    },
  },
  {
    name: 'Silver',
    pointsFrom: 2001,
    pointsTo: 5501,
    spendFrom: 50002,
    spendTo: 100002,
    rewardPercentage: 7,
    benefits: {
      description: 'Silver tier with 7% points reward',
      perks: ['Birthday discount', 'Priority customer service', 'Exclusive Silver offers'],
    },
  },
  {
    name: 'Gold',
    pointsFrom: 5502,
    pointsTo: 20502,
    spendFrom: 100003,
    spendTo: 250003,
    rewardPercentage: 10,
    benefits: {
      description: 'Gold tier with 10% points reward',
      perks: ['Birthday discount', 'Dedicated account manager', 'Early access to sales', 'Free alterations'],
    },
  },
  {
    name: 'Platinum',
    pointsFrom: 20503,
    pointsTo: null as number | null,
    spendFrom: 250004,
    spendTo: null as number | null,
    rewardPercentage: 15,
    benefits: {
      description: 'Platinum tier with 15% points reward — top tier',
      perks: [
        'Birthday discount',
        'VIP lounge access',
        'Personal stylist',
        'Free home delivery',
        'Invitation to exclusive events',
      ],
    },
  },
];

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async seedIfEmpty() {
    if (process.env.SKIP_DEMO_SEED === '1') {
      this.logger.log('SKIP_DEMO_SEED=1 — skipping demo customer seed');
      return;
    }
    try {
      await this.ensureTiers();
      await this.doSeedIfEmpty();
    } catch (err) {
      // Never crash the API on seed failure — just log and continue
      this.logger.error({ err }, 'seedIfEmpty failed — skipping seed');
    }
  }

  private async ensureTiers() {
    for (const tier of DEFAULT_TIERS) {
      await this.prisma.loyaltyTier.upsert({
        where: { name: tier.name },
        update: {},
        create: {
          name: tier.name,
          pointsFrom: tier.pointsFrom,
          pointsTo: tier.pointsTo,
          spendFrom: tier.spendFrom,
          spendTo: tier.spendTo,
          rewardPercentage: tier.rewardPercentage,
          benefits: tier.benefits,
        },
      });
    }
  }

  private async clearSeedDemoData() {
    this.logger.log('Clearing seed demo data for reseed…');
    const seedCustomers = await this.prisma.customer.findMany({
      where: { retailproId: { startsWith: 'RP-' } },
      select: { id: true },
    });
    const seedIds = seedCustomers.map((c) => c.id);
    if (seedIds.length > 0) {
      await this.prisma.customerNote.deleteMany({ where: { customerId: { in: seedIds } } });
      await this.prisma.pointsExpiry.deleteMany({ where: { customerId: { in: seedIds } } });
      await this.prisma.pointsLedger.deleteMany({ where: { customerId: { in: seedIds } } });
      await this.prisma.notificationLog.deleteMany({ where: { customerId: { in: seedIds } } });
      await this.prisma.transaction.deleteMany({ where: { customerId: { in: seedIds } } });
      await this.prisma.customer.deleteMany({ where: { id: { in: seedIds } } });
    }
    await this.prisma.transaction.deleteMany({
      where: { retailproTransactionId: { startsWith: 'SEED-' } },
    });
  }

  private async doSeedIfEmpty() {
    // Detect old seed data (transactions using the old 'TXN-' prefix) and clean up
    const oldSeedTx = await this.prisma.transaction.findFirst({
      where: { retailproTransactionId: { startsWith: 'TXN-' } },
    });
    if (oldSeedTx) {
      this.logger.log('Migrating old SEED prefix TXN- → SEED- …');
      await this.prisma.transaction.updateMany({
        where: { retailproTransactionId: { startsWith: 'TXN-' } },
        data: {
          retailproTransactionId: oldSeedTx.retailproTransactionId.replace('TXN-', 'SEED-'),
        },
      });
    }

    const force = process.env.FORCE_DEMO_SEED === '1';
    const demoCustomerCount = await this.prisma.customer.count({
      where: { retailproId: { startsWith: 'RP-' } },
    });

    if (!force && demoCustomerCount > 0) {
      this.logger.log('Demo seed data already present — skipping (set FORCE_DEMO_SEED=1 to reseed)');
      return;
    }

    if (force) {
      await this.clearSeedDemoData();
    } else {
      // Clean orphaned SEED transactions if any
      const seedTx = await this.prisma.transaction.findFirst({
        where: { retailproTransactionId: { startsWith: 'SEED-' } },
      });
      if (seedTx) await this.clearSeedDemoData();
    }

    this.logger.log('Seeding realistic demo data…');

    const tiers = await this.prisma.loyaltyTier.findMany({ orderBy: { spendFrom: 'asc' } });
    if (tiers.length === 0) {
      this.logger.warn('No tiers found, skipping customer seed');
      return;
    }

    const getTierBySpend = (spend: number) =>
      [...tiers]
        .reverse()
        .find((t) => Number(t.spendFrom) <= spend) ?? tiers[0];

    const getRewardPct = (tier: { rewardPercentage: unknown }) => Number(tier.rewardPercentage);

    const seedStamp = Date.now();

    for (let i = 0; i < CUSTOMERS.length; i++) {
      const c = CUSTOMERS[i];
      // Vary purchase history so customers land in different tiers
      const txCount = 4 + (i % 8) + (c.segment === 'champion' ? 4 : 0);
      const amountBoost = c.segment === 'champion' ? 1.8 : c.segment === 'loyal' ? 1.2 : 1;
      const txSlice = TX_TEMPLATES.slice(0, Math.min(txCount, TX_TEMPLATES.length)).map(
        ([amount, daysAgo]) => [Math.round(Number(amount) * amountBoost), daysAgo] as const,
      );

      let totalPoints = 0;
      let lifetimeSale = 0;

      for (const [amount] of txSlice) {
        const tierAtTime = getTierBySpend(lifetimeSale);
        const pts = Math.round((Number(amount) * getRewardPct(tierAtTime)) / 100);
        totalPoints += pts;
        lifetimeSale += Number(amount);
      }

      const finalTier = getTierBySpend(lifetimeSale);
      const lastVisitDays = Number(txSlice[txSlice.length - 1][1]);

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
          city: c.city,
          area: c.area,
          occupation: c.occupation,
          maritalStatus: c.maritalStatus,
          preferredChannel: c.preferredChannel,
          nationality: 'Pakistani',
          segment: c.segment,
          engagementScore: Math.min(100, 20 + txSlice.length * 8 + (c.segment === 'champion' ? 25 : 0)),
          tierId: finalTier.id,
          totalPoints,
          lifetimePoints: totalPoints,
          lifetimeSale,
          lastVisitDate: this.daysAgo(lastVisitDays),
          isActive: true,
          status: 'active',
        },
      });

      await this.prisma.customerNote.create({
        data: {
          customerId: customer.id,
          body: `Demo note: Prefers ${c.store}. Segment=${c.segment}.`,
          addedBy: 'seed',
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
        const taxAmount = Math.round(Number(amount) * 0.05 * 100) / 100;
        const grossAmount = Math.round((Number(amount) + taxAmount) * 100) / 100;

        const tx = await this.prisma.transaction.create({
          data: {
            retailproTransactionId: `SEED-${seedStamp}-${i}-${j}`,
            customerId: customer.id,
            transactionDate: txDate,
            saleAmount: amount as number,
            pointsEarned: pts,
            pointsRedeemed: 0,
            redemptionAmount: 0,
            receiptNo: `REC-${10000 + i * 20 + j}`,
            store: c.store,
            region: c.region,
            outlet: c.store,
            taxAmount,
            grossAmount,
            totalDiscount: j % 4 === 0 ? 500 : 0,
            status: 'completed',
          },
        });

        // 1–3 line items per transaction
        const itemCount = 1 + ((i + j) % 3);
        let remaining = Number(amount);
        for (let k = 0; k < itemCount; k++) {
          const product = PRODUCTS[(i + j + k) % PRODUCTS.length];
          const isLast = k === itemCount - 1;
          const lineTotal = isLast
            ? remaining
            : Math.min(remaining, Math.round(product.unitPrice * (1 + ((i + k) % 2))));
          remaining = Math.round((remaining - lineTotal) * 100) / 100;
          const qty = Math.max(1, Math.round(lineTotal / product.unitPrice) || 1);
          const unitPrice = Math.round((lineTotal / qty) * 100) / 100;
          await this.prisma.transactionItem.create({
            data: {
              transactionId: tx.id,
              sku: product.sku,
              description: product.description,
              qty,
              unitPrice,
              totalPrice: lineTotal,
              itemDiscount: j % 4 === 0 && k === 0 ? 200 : 0,
              taxAmount: Math.round(lineTotal * 0.05 * 100) / 100,
              grossAmount: Math.round(lineTotal * 1.05 * 100) / 100,
              netAmount: lineTotal,
              dcs: { dept: 'APPAREL', class: 'MENS', subclass: 'CASUAL' },
            },
          });
        }

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
            pointsRemaining: pts,
            earningDate: txDate,
            expiryDate,
            isExpired: false,
          },
        });
      }

      this.logger.log(`Seeded customer: ${c.name} (${finalTier.name}, ${totalPoints} pts)`);
    }

    this.logger.log(`Test data seeded successfully (${CUSTOMERS.length} customers)`);
  }

  private daysAgo(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }
}
