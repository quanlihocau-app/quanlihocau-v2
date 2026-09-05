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
    const passwordHash = "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjIQqiRQYq"; // wM9#kZ2$pL8xV!qT
    const systemRole = "SUPER_ADMIN";

    const checkRes = await pool.query('SELECT id, email, "systemRole" FROM "User" WHERE email = $1', [email]);
    if (checkRes.rows.length > 0) {
        await pool.query('UPDATE "User" SET "systemRole" = $1, name = $2, "passwordHash" = $3 WHERE email = $4', [
            systemRole,
            name,
            passwordHash,
            email,
        ]);
        console.log("Updated Super Admin user:", email, "systemRole:", systemRole);
    } else {
        const id = crypto.randomUUID();
        await pool.query(
            'INSERT INTO "User" (id, email, name, "passwordHash", "systemRole", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
            [id, email, name, passwordHash, systemRole]
        );
        console.log("Created Super Admin user:", email, "systemRole:", systemRole);
    }
    await pool.end();
}

main().catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
});
