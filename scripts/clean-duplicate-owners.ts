// scripts/clean-duplicate-owners.ts
import { PrismaClient } from "../src/generated/prisma/client";


const prisma = new PrismaClient();

async function main() {
  const lakeName = "Kim Thông";
  const keepOwnerEmail = "Huantr87@gmail.com";

  // Find the lake by name
  const lake = await prisma.lake.findFirst({ where: { name: lakeName } });
  if (!lake) {
    console.error(`Không tìm thấy hồ: ${lakeName}`);
    process.exit(1);
  }

  // Find all OWNER memberships for this lake
  const owners = await prisma.membership.findMany({
    where: { lakeId: lake.id, role: "OWNER" },
    include: { user: true },
  });

  // Identify the owner that must be kept
  const keepOwner = owners.find((o) => o.user?.email === keepOwnerEmail);
  if (!keepOwner) {
    console.error(`Không tìm thấy owner ${keepOwnerEmail} trong hồ ${lakeName}`);
    process.exit(1);
  }

  // Delete any other OWNER memberships
  const toDelete = owners.filter((o) => o.id !== keepOwner.id);
  for (const m of toDelete) {
    await prisma.membership.delete({ where: { id: m.id } });
    console.log(`Xóa OWNER ${m.user.email} khỏi hồ ${lakeName}`);
  }

  // Remove any other memberships (STAFF, MANAGER, etc.) created by huant5300@gmail.com on this lake
  const extra = await prisma.membership.findMany({
    where: { lakeId: lake.id, user: { email: "huant5300@gmail.com" } },
  });
  for (const m of extra) {
    await prisma.membership.delete({ where: { id: m.id } });
    console.log(`Xóa thành viên ${m.userId} (huant5300) khỏi hồ ${lakeName}`);
  }

  console.log("✔ Hoàn tất dọn sạch OWNER/STAFF cho hồ Kim Thông");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
