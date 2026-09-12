import pg from "pg";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
}

const pool = new Pool({ connectionString: databaseUrl });

async function main() {
    const email = "huan.sysops@quanlihocau.com";
    const name = "System Admin";
    const passwordHash = "$2b$10$eHBeDc20BuJ9aQ0EzVgaIu70yhOIhlrsxKSr8oQcJNxpypO6dHD7a"; // wM9#kZ2$pL8xV!qT
    const systemRole = "SUPER_ADMIN";

    const checkRes = await pool.query('SELECT id, email, "systemRole" FROM "User" WHERE email = $1', [email]);
    let userId;
    if (checkRes.rows.length > 0) {
        userId = checkRes.rows[0].id;
        await pool.query('UPDATE "User" SET "systemRole" = $1, name = $2, "passwordHash" = $3, "phoneVerified" = TRUE WHERE email = $4', [
            systemRole,
            name,
            passwordHash,
            email,
        ]);
        console.log("Updated Super Admin user:", email, "systemRole:", systemRole);
    } else {
        userId = crypto.randomUUID();
        await pool.query(
            'INSERT INTO "User" (id, email, name, "passwordHash", "systemRole", "phoneVerified", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())',
            [userId, email, name, passwordHash, systemRole]
        );
        console.log("Created Super Admin user:", email, "systemRole:", systemRole);
    }

    // Ensure super admin has membership in primary lake
    const lakeRes = await pool.query('SELECT id, name FROM "Lake" WHERE "deletedAt" IS NULL ORDER BY "createdAt" ASC LIMIT 1');
    if (lakeRes.rows.length > 0) {
        const lake = lakeRes.rows[0];
        const memRes = await pool.query('SELECT id FROM "Membership" WHERE "userId" = $1 AND "lakeId" = $2', [userId, lake.id]);
        if (memRes.rows.length === 0) {
            await pool.query(
                'INSERT INTO "Membership" (id, "userId", "lakeId", role, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())',
                [crypto.randomUUID(), userId, lake.id, 'OWNER']
            );
            console.log(`Assigned Super Admin to lake "${lake.name}" as OWNER.`);
        }
    }
    await pool.end();
}

main().catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
});
