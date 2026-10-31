// scripts/fix-owner-issue.ts
/**
 * Triệt để xóa người dùng huant5300@gmail.com khỏi hồ "Kim Thông" và
 * đảm bảo chỉ có một OWNER duy nhất (Huantr87@gmail.com).
 * Cũng thực hiện tăng sessionVersion để làm hết hạn token hiện tại.
 */

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

const LAKE_NAME = "Kim Thông";
const KEEP_OWNER_EMAIL = "Huantr87@gmail.com";
const TARGET_EMAIL = "huant5300@gmail.com";

async function main() {
  console.log("🚀 Bắt đầu xử lý…");

  // -----------------------------------------------------------------
  // 1️⃣ Tìm hồ
  // -----------------------------------------------------------------
  const lake = await prisma.lake.findFirst({ where: { name: LAKE_NAME } });
  if (!lake) {
    console.error(`❌ Không tìm thấy hồ: ${LAKE_NAME}`);
    process.exit(1);
  }
  console.log(`🏞️ Hồ "${LAKE_NAME}" (id=${lake.id}) đã tìm thấy`);

  // -----------------------------------------------------------------
  // 2️⃣ Xóa mọi membership của huant5300 trên hồ này
  // -----------------------------------------------------------------
  const toDelete = await prisma.membership.findMany({
    where: { lakeId: lake.id, user: { email: TARGET_EMAIL } },
  });

  if (toDelete.length === 0) {
    console.log(`ℹ️ Không có membership nào của ${TARGET_EMAIL} trên hồ ${LAKE_NAME}`);
  } else {
    for (const m of toDelete) {
      await prisma.membership.delete({ where: { id: m.id } });
      console.log(`🗑️ Đã xóa ${m.role} (id=${m.id}) của ${TARGET_EMAIL}`);
    }
  }

  // -----------------------------------------------------------------
  // 3️⃣ Đảm bảo chỉ một OWNER duy nhất và là Huantr87
  // -----------------------------------------------------------------
  const owners = await prisma.membership.findMany({
    where: { lakeId: lake.id, role: "OWNER" },
    include: { user: true },
  });

  const keepOwner = owners.find(o => o.user?.email === KEEP_OWNER_EMAIL);
  if (!keepOwner) {
    console.error(`❌ Không tìm thấy OWNER ${KEEP_OWNER_EMAIL} trên hồ ${LAKE_NAME}`);
    process.exit(1);
  }

  const extraOwners = owners.filter(o => o.id !== keepOwner.id);
  for (const o of extraOwners) {
    await prisma.membership.delete({ where: { id: o.id } });
    console.log(`🗑️ Xóa OWNER thừa ${o.user?.email}`);
  }
  console.log(`✅ Đảm bảo chỉ còn OWNER ${KEEP_OWNER_EMAIL}`);

  // -----------------------------------------------------------------
  // 4️⃣ Cập nhật ownerId trong bảng Lake (nếu có)
  // -----------------------------------------------------------------
  const hasOwnerId = await prisma.$queryRawUnsafe(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'Lake' AND column_name = 'ownerId';
  `);

  if (Array.isArray(hasOwnerId) && hasOwnerId.length > 0) {
    const userId = keepOwner.user?.id;
    if (!userId) throw new Error("Không tìm thấy userId của keeper owner");
    await prisma.lake.update({
      where: { id: lake.id },
      data: { ownerId: userId },
    });
    console.log(`🔧 ownerId của Lake được cập nhật → ${KEEP_OWNER_EMAIL}`);
  } else {
    console.log("ℹ️ Bảng Lake không có cột ownerId → không cần cập nhật");
  }

  // -----------------------------------------------------------------
  // 5️⃣ Đăng xuất toàn bộ người dùng (tăng sessionVersion)
  // -----------------------------------------------------------------
  const updated = await prisma.user.updateMany({
    data: { sessionVersion: { increment: 1 } },
  });
  console.log(`🔐 Đã tăng sessionVersion cho ${updated.count} người dùng (token cũ hết hạn)`);

  console.log("\n🎉 Hoàn tất! Hãy reload UI và đăng nhập lại.");
}

main()
  .catch(e => {
    console.error("❌ Lỗi khi thực thi:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

