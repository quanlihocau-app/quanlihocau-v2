// reset_kim_thong_owner.ts
// Script để xóa toàn bộ thành viên của hồ "Kim Thông" và gán quyền sở hữu cho tài khoản Google huantr87.

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const lakeName = process.env.TARGET_LAKE_NAME ?? "Kim Thông";
  const ownerEmail = process.env.OWNER_GOOGLE_EMAIL ?? "huantr87@gmail.com";

  console.log(`\n🔍 Tìm hồ: "${lakeName}"`);
  console.log(`🔍 Tìm user: "${ownerEmail}"`);

  // Tìm hồ
  const lake = await prisma.lake.findFirst({
    where: { name: lakeName },
  });

  if (!lake) {
    console.error(`❌ Không tìm thấy hồ với tên "${lakeName}"`);
    process.exit(1);
  }

  console.log(`✅ Found lake: ${lake.id} (${lake.name})`);

  // Tìm người dùng (owner) theo email
  const user = await prisma.user.findUnique({
    where: { email: ownerEmail },
  });

  if (!user) {
    console.error(`❌ Không tìm thấy người dùng với email "${ownerEmail}"`);
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.id} (${user.email})`);

  // Hiển thị memberships hiện tại trước khi xóa
  const current = await prisma.membership.findMany({
    where: { lakeId: lake.id },
    include: { user: true },
  });
  console.log(`\n📋 Memberships hiện tại (${current.length}):`);
  current.forEach(m => console.log(`   - ${m.user.email} [${m.role}]`));

  // Xóa tất cả membership hiện có của hồ này
  const deleted = await prisma.membership.deleteMany({
    where: { lakeId: lake.id },
  });
  console.log(`\n🗑️  Đã xóa ${deleted.count} membership(s) của hồ "${lakeName}"`);

  // Tạo membership mới với vai trò OWNER
  const newMembership = await prisma.membership.create({
    data: {
      userId: user.id,
      lakeId: lake.id,
      role: Role.OWNER,
    },
  });
  console.log(`\n✅ Đã tạo OWNER membership: ${newMembership.id}`);
  console.log(`   User: ${user.email}`);
  console.log(`   Lake: ${lake.name}`);
  console.log(`   Role: OWNER`);
  console.log(`\n🎉 Hoàn thành! Hồ "${lakeName}" hiện chỉ có 1 OWNER: ${ownerEmail}`);
}

main()
  .catch(e => { console.error("❌ Error:", e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
