import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

async function main() {
  const ownerEmail = "Huantr87@gmail.com";
  // Ensure owner user exists
  const ownerUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!ownerUser) {
    console.error(`User with email ${ownerEmail} not found`);
    process.exit(1);
  }

  const lakes = await prisma.lake.findMany({ select: { id: true } });
  for (const lake of lakes) {
    // Delete any existing OWNER membership for this lake
    await prisma.membership.deleteMany({
      where: { lakeId: lake.id, role: Role.OWNER },
    });
    // Create OWNER membership for Huantr87
    await prisma.membership.create({
      data: {
        userId: ownerUser.id,
        lakeId: lake.id,
        role: Role.OWNER,
      },
    });
    console.log(`Set ${ownerEmail} as OWNER for lake ${lake.id}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

