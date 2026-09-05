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
      passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjIQqiRQYq', // Mã hóa của wM9#kZ2$pL8xV!qT
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
      description: 'Gói dùng thử 30 ngày miễn phí, mở full tính năng (tương đương Gói Vàng).',
    },
    {
      code: 'SILVER' as const,
      name: 'Gói Bạc (Silver)',
      priceVnd: 99000,
      durationDays: 30,
      maxSpots: 30,
      maxStaff: 1,
      description: 'Gói Bạc 99.000 VNĐ/tháng: Tối đa 30 ô câu, tối đa 1 nhân viên.',
    },
    {
      code: 'GOLD' as const,
      name: 'Gói Vàng (Gold)',
      priceVnd: 179000,
      durationDays: 30,
      maxSpots: null,
      maxStaff: null,
      description: 'Gói Vàng 179.000 VNĐ/tháng: Không giới hạn ô câu, không giới hạn nhân viên, đầy đủ tính năng.',
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
