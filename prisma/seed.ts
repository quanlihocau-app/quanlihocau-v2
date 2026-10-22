import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.user.upsert({
    where: { email: 'huan.sysops@quanlihocau.com' },
    update: {
      systemRole: 'SUPER_ADMIN',
    },
    create: {
      email: 'huan.sysops@quanlihocau.com',
      name: 'System Admin',
      passwordHash: '$2b$10$enV1qXf6R9aMTJ57OO9xTu60KRnY1v8WvxxLG3ShxAlp5Zw4MtlM6',
      systemRole: 'SUPER_ADMIN', // Chuẩn theo Prisma schema
    },
  })
  console.log("Super Admin seeded successfully: huan.sysops@quanlihocau.com")

  // Seed 3 SaaS Subscription Plans
  const plans = [
    {
      code: 'TRIAL' as const,
      name: 'Dùng thử 30 ngày',
      priceVnd: 0,
      durationDays: 30,
      maxSpots: null,
      maxStaff: null,
      description: 'Gói dùng thử 30 ngày cho tài khoản mới, mở full tính năng (tương đương Gói Vàng).',
    },
    {
      code: 'SILVER' as const,
      name: 'Gói Bạc (Silver)',
      priceVnd: 129000,
      durationDays: 30,
      maxSpots: 30,
      maxStaff: 2,
      description: 'Gói Bạc 129.000đ/tháng: tối đa 30 ô câu, chủ hồ và 2 tài khoản nhân sự.',
    },
    {
      code: 'GOLD' as const,
      name: 'Gói Vàng (Gold)',
      priceVnd: 199000,
      durationDays: 30,
      maxSpots: null,
      maxStaff: null,
      description: 'Gói Vàng 199.000đ/tháng: không giới hạn ô câu và nhân sự.',
    },
  ];

  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        priceVnd: p.priceVnd,
        durationDays: p.durationDays,
        maxSpots: p.maxSpots,
        maxStaff: p.maxStaff,
        description: p.description,
      },
      create: p,
    });
  }
  console.log("Subscription plans seeded successfully: TRIAL, SILVER, GOLD");
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
