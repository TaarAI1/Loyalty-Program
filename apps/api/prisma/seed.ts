import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Default loyalty tiers
  await prisma.loyaltyTier.upsert({
    where: { name: 'Classic' },
    update: {},
    create: {
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
  });

  await prisma.loyaltyTier.upsert({
    where: { name: 'Silver' },
    update: {},
    create: {
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
  });

  await prisma.loyaltyTier.upsert({
    where: { name: 'Gold' },
    update: {},
    create: {
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
  });

  await prisma.loyaltyTier.upsert({
    where: { name: 'Platinum' },
    update: {},
    create: {
      name: 'Platinum',
      pointsFrom: 20503,
      pointsTo: null,
      spendFrom: 250004,
      spendTo: null,
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
  });

  // Default WhatsApp config placeholder
  await prisma.whatsappConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      apiProvider: 'meta',
      templateExpiry: 'points_expiry_notification',
      templateBirthday: 'birthday_discount',
      templatePointsEarned: 'points_earned_confirmation',
      templateTierUpgrade: 'tier_upgrade_congratulations',
      isActive: false,
    },
  });

  // Default SMS config placeholder
  await prisma.smsConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, provider: 'twilio', isActive: false },
  });

  // Default email config placeholder
  await prisma.emailConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, provider: 'sendgrid', isActive: false },
  });

  console.log('✅ Seeding complete');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
