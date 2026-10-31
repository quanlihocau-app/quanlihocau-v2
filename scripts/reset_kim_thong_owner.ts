// reset_kim_thong_owner.ts
// Script để xóa toàn bộ thành viên của hồ "Kim Thông" và gán quyền sở hữu cho tài khoản Google huantr87.

import { PrismaClient, Role } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const lakeName = process.env.TARGET_LAKE_NAME;
  const ownerEmail = process.env.OWNER_GOOGLE_EMAIL;

  if (!lakeName || !ownerEmail) {
    console.error("Missing TARGET_LAKE_NAME or OWNER_GOOGLE_EMAIL in .env");
    process.exit(1);
  }

  // Tìm hồ
  const lake = await prisma.lake.findFirst({
    where: { name: lakeName },
  });

  if (!lake) {
    console.error(`Không tìm thấy hồ với tên "${lakeName}"`);
    process.exit(1);
  }

  console.log(`Found lake: ${lake.id} (${lake.name})`);

  // Tìm người dùng (owner) theo email
  const user = await prisma.user.findUnique({
    where: { email: ownerEmail },
  });

  if (!user) {
    console.error(`Không tìm thấy người dùng với email "${ownerEmail}"`);
    process.exit(1);
  }

  console.log(`Found user: ${user.id} (${user.email})`);

  // Xóa tất cả membership hiện có của hồ này
  const deleted = await prisma.membership.deleteMany({
    where: { lakeId: lake.id },
  });
  console.log(`Đã xóa ${deleted.count} membership(s) của hồ "${lakeName}"`);

  // Tạo membership mới với vai trò OWNER
  const newMembership = await prisma.membership.create({
    data: {
      userId: user.id,
      lakeId: lake.id,
      role: Role.OWNER,
    },
  });
  console.log(`Created OWNER membership: ${newMembership.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

