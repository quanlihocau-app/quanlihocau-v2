import pg from "pg";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
}

const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
});

function percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
}

async function runBenchmark() {
    const lakeRes = await pool.query('SELECT id, name FROM "Lake" LIMIT 1');
    if (lakeRes.rows.length === 0) {
        console.error("No lake found in database");
        process.exit(1);
    }
    const testLakeId = lakeRes.rows[0].id;
    console.log(`[Step 2 DB Benchmark] Target Lake: "${lakeRes.rows[0].name}" (${testLakeId})\n`);

    const query1 = {
        name: "active-sessions-query",
        text: `
            SELECT fs.id, fs."startAt", fs."plannedEndAt", fs."paymentTiming",
                   c.id AS customer_id, c.name AS customer_name, c."phoneNormalized",
                   p.id AS package_id, p.name AS package_name, p."durationMinutes", p."priceVnd", p."overtimeHourlyVnd"
            FROM "FishingSession" fs
            LEFT JOIN "Customer" c ON c.id = fs."customerId"
            LEFT JOIN "Package" p ON p.id = fs."packageId"
            WHERE fs."lakeId" = $1 AND fs."status" = 'ACTIVE'
            ORDER BY fs."startAt" DESC
        `,
        values: [testLakeId],
    };

    const query2 = {
        name: "packages-query",
        text: `
            SELECT id, name, "durationMinutes", "priceVnd"
            FROM "Package"
            WHERE "lakeId" = $1 AND "deletedAt" IS NULL
            ORDER BY "createdAt" ASC
        `,
        values: [testLakeId],
    };

    const query3 = {
        name: "fish-types-query",
        text: `
            SELECT id, name, "pricePerKg"
            FROM "FishType"
            WHERE "lakeId" = $1 AND "deletedAt" IS NULL
            ORDER BY name ASC
        `,
        values: [testLakeId],
    };

    // Warm-up
    for (let i = 0; i < 5; i++) {
        await pool.query(query1);
        await pool.query(query2);
        await pool.query(query3);
    }

    const ITERATIONS = 30;
    const sequentialTimes = [];
    const parallelTimes = [];

    // ── 1. Sequential Waterfall (Current Baseline) ────────────────────────
    for (let i = 0; i < ITERATIONS; i++) {
        const t0 = performance.now();

        await pool.query(query1);
        await pool.query(query2);
        await pool.query(query3);

        const elapsed = performance.now() - t0;
        sequentialTimes.push(elapsed);
    }

    // ── 2. Parallel (Promise.all) ──────────────────────────────────────────
    for (let i = 0; i < ITERATIONS; i++) {
        const t0 = performance.now();

        await Promise.all([
            pool.query(query1),
            pool.query(query2),
            pool.query(query3),
        ]);

        const elapsed = performance.now() - t0;
        parallelTimes.push(elapsed);
    }

    const seqMean = sequentialTimes.reduce((a, b) => a + b, 0) / ITERATIONS;
    const seqP50 = percentile(sequentialTimes, 50);
    const seqP95 = percentile(sequentialTimes, 95);

    const parMean = parallelTimes.reduce((a, b) => a + b, 0) / ITERATIONS;
    const parP50 = percentile(parallelTimes, 50);
    const parP95 = percentile(parallelTimes, 95);

    const improvementP50 = Math.round(((seqP50 - parP50) / seqP50) * 100);
    const improvementP95 = Math.round(((seqP95 - parP95) / seqP95) * 100);

    console.log("=== DB QUERY WATERFALL BENCHMARK (30 ITERATIONS) ===");
    console.table([
        {
            Pattern: "Sequential Waterfall (Baseline)",
            "Mean (ms)": seqMean.toFixed(2),
            "p50 (ms)": seqP50.toFixed(2),
            "p95 (ms)": seqP95.toFixed(2),
        },
        {
            Pattern: "Promise.all (Parallel)",
            "Mean (ms)": parMean.toFixed(2),
            "p50 (ms)": parP50.toFixed(2),
            "p95 (ms)": parP95.toFixed(2),
        },
    ]);
    console.log(`Kết quả: p50 giảm từ ${seqP50.toFixed(2)}ms xuống ${parP50.toFixed(2)}ms (Nhanh hơn ${improvementP50}%).`);
    console.log(`         p95 giảm từ ${seqP95.toFixed(2)}ms xuống ${parP95.toFixed(2)}ms (Nhanh hơn ${improvementP95}%).\n`);

    await pool.end();
}

runBenchmark().catch((err) => {
    console.error("Benchmark error:", err);
    process.exit(1);
});
