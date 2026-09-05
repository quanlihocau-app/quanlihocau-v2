import pg from "pg";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
}

const pool = new Pool({ connectionString: databaseUrl });

async function main() {
    const client = await pool.connect();
    try {
        // 1. Seed Super Admin
        const superAdminEmail = 'huan.sysops@quanlihocau.com';
        const passwordHash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjIQqiRQYq';
        await client.query(`
            INSERT INTO "User" ("id", "email", "name", "passwordHash", "systemRole", "createdAt", "updatedAt")
            VALUES (gen_random_uuid()::text, $1, 'System Admin', $2, 'SUPER_ADMIN', NOW(), NOW())
            ON CONFLICT ("email")
            DO UPDATE SET "systemRole" = 'SUPER_ADMIN', "updatedAt" = NOW();
        `, [superAdminEmail, passwordHash]);
        console.log("Super Admin seeded successfully:", superAdminEmail);

        // 2. Seed 3 SaaS Subscription Plans
        const plans = [
            {
                code: 'TRIAL',
                name: 'Dùng thử 30 ngày',
                priceVnd: 0,
                durationDays: 30,
                maxSpots: null,
                maxStaff: null,
                description: 'Gói dùng thử 30 ngày miễn phí, mở full tính năng (tương đương Gói Vàng).',
            },
            {
                code: 'SILVER',
                name: 'Gói Bạc (Silver)',
                priceVnd: 99000,
                durationDays: 30,
                maxSpots: 30,
                maxStaff: 1,
                description: 'Gói Bạc 99.000 VNĐ/tháng: Tối đa 30 ô câu, tối đa 1 nhân viên.',
            },
            {
                code: 'GOLD',
                name: 'Gói Vàng (Gold)',
                priceVnd: 179000,
                durationDays: 30,
                maxSpots: null,
                maxStaff: null,
                description: 'Gói Vàng 179.000 VNĐ/tháng: Không giới hạn ô câu, không giới hạn nhân viên, đầy đủ tính năng.',
            },
        ];

        for (const p of plans) {
            await client.query(`
                INSERT INTO "SubscriptionPlan" ("id", "code", "name", "priceVnd", "durationDays", "maxSpots", "maxStaff", "description", "createdAt", "updatedAt")
                VALUES (gen_random_uuid()::text, $1::"PlanTier", $2, $3, $4, $5, $6, $7, NOW(), NOW())
                ON CONFLICT ("code")
                DO UPDATE SET
                    "name" = EXCLUDED."name",
                    "priceVnd" = EXCLUDED."priceVnd",
                    "durationDays" = EXCLUDED."durationDays",
                    "maxSpots" = EXCLUDED."maxSpots",
                    "maxStaff" = EXCLUDED."maxStaff",
                    "description" = EXCLUDED."description",
                    "updatedAt" = NOW();
            `, [p.code, p.name, p.priceVnd, p.durationDays, p.maxSpots, p.maxStaff, p.description]);
        }
        console.log("Subscription plans seeded successfully: TRIAL, SILVER, GOLD");
    } finally {
        client.release();
    }
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => pool.end());
