import { prisma } from "../src/lib/prisma";
import { performance } from "perf_hooks";

async function runOptimizedBenchmark() {
  const session = await prisma.fishingSession.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      hutLinks: { select: { hutId: true } },
      customer: { select: { id: true, name: true, phoneNormalized: true } },
      package: { select: { id: true, name: true, durationMinutes: true, priceVnd: true, overtimeHourlyVnd: true } },
      invoices: { include: { lines: true, payments: true } }
    }
  });

  if (!session) {
    console.error("No session found");
    await prisma.$disconnect();
    return;
  }

  const lakeId = session.lakeId;
  const invoiceId = session.invoices[0]?.id;

  console.log(`Testing with session: ${session.id}, lakeId: ${lakeId}, invoiceId: ${invoiceId}`);

  const timings = {
    // Before: 6 round trips
    beforeSession1: [] as number[],
    beforeInvoice1: [] as number[],
    beforeLines: [] as number[],
    beforePayments: [] as number[],
    beforeSessionEnd: [] as number[],
    beforeInvoiceEnd: [] as number[],

    // After: 2 round trips
    afterSessionEager: [] as number[],
    afterInvoiceEager: [] as number[],
  };

  const ITERATIONS = 20;

  for (let i = 0; i < ITERATIONS; i++) {
    // ── BEFORE PATTERN ──
    let t0 = performance.now();
    await prisma.fishingSession.findFirst({
      where: { id: session.id, lakeId },
      include: {
        hutLinks: { select: { hutId: true } },
        customer: { select: { name: true, phoneNormalized: true } },
        package: { select: { id: true, name: true, durationMinutes: true, priceVnd: true, overtimeHourlyVnd: true } }
      }
    });
    timings.beforeSession1.push(performance.now() - t0);

    t0 = performance.now();
    const inv = await prisma.invoice.findFirst({
      where: { fishingSessionId: session.id, lakeId }
    });
    timings.beforeInvoice1.push(performance.now() - t0);

    if (inv) {
      t0 = performance.now();
      await prisma.invoiceLine.findMany({ where: { invoiceId: inv.id } });
      timings.beforeLines.push(performance.now() - t0);

      t0 = performance.now();
      await prisma.payment.findMany({ where: { invoiceId: inv.id } });
      timings.beforePayments.push(performance.now() - t0);

      t0 = performance.now();
      await prisma.invoice.findFirst({
        where: { fishingSessionId: session.id, lakeId },
        include: { lines: true, payments: true }
      });
      timings.beforeInvoiceEnd.push(performance.now() - t0);
    }

    t0 = performance.now();
    await prisma.fishingSession.findUniqueOrThrow({
      where: { id: session.id },
      include: {
        customer: { select: { id: true, name: true, phoneNormalized: true } },
        package: { select: { id: true, name: true, durationMinutes: true, priceVnd: true } },
        hutLinks: {
          include: {
            hut: {
              select: {
                id: true,
                name: true,
                area: { select: { id: true, name: true } }
              }
            }
          }
        }
      }
    });
    timings.beforeSessionEnd.push(performance.now() - t0);

    // ── AFTER PATTERN (Optimized) ──
    t0 = performance.now();
    await prisma.fishingSession.findFirst({
      where: { id: session.id, lakeId },
      include: {
        hutLinks: {
          include: {
            hut: {
              select: {
                id: true,
                name: true,
                area: { select: { id: true, name: true } }
              }
            }
          }
        },
        customer: { select: { id: true, name: true, phoneNormalized: true } },
        package: { select: { id: true, name: true, durationMinutes: true, priceVnd: true, overtimeHourlyVnd: true } }
      }
    });
    timings.afterSessionEager.push(performance.now() - t0);

    t0 = performance.now();
    await prisma.invoice.findFirst({
      where: { fishingSessionId: session.id, lakeId },
      include: { lines: true, payments: true }
    });
    timings.afterInvoiceEager.push(performance.now() - t0);
  }

  function calcStats(arr: number[]) {
    if (!arr.length) return { mean: 0, p50: 0, p95: 0 };
    const sorted = [...arr].sort((a, b) => a - b);
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    return { mean: parseFloat(mean.toFixed(2)), p50: parseFloat(p50.toFixed(2)), p95: parseFloat(p95.toFixed(2)) };
  }

  const bS1 = calcStats(timings.beforeSession1);
  const bI1 = calcStats(timings.beforeInvoice1);
  const bLines = calcStats(timings.beforeLines);
  const bPayments = calcStats(timings.beforePayments);
  const bSEnd = calcStats(timings.beforeSessionEnd);
  const bIEnd = calcStats(timings.beforeInvoiceEnd);

  const aSEager = calcStats(timings.afterSessionEager);
  const aIEager = calcStats(timings.afterInvoiceEager);

  const beforeTotalP50 = bS1.p50 + bI1.p50 + bLines.p50 + bPayments.p50 + bSEnd.p50 + bIEnd.p50;
  const afterTotalP50 = aSEager.p50 + aIEager.p50;

  console.log("\n=================== BENCHMARK STEP 4 RESULTS ===================");
  console.log("BEFORE OPTIMIZATION (6 DB Round Trips):");
  console.log(`  1. Session Initial:        ${bS1.p50} ms (p95: ${bS1.p95} ms)`);
  console.log(`  2. Invoice (no include):   ${bI1.p50} ms (p95: ${bI1.p95} ms)`);
  console.log(`  3. InvoiceLine findMany:   ${bLines.p50} ms (p95: ${bLines.p95} ms)`);
  console.log(`  4. Payment findMany:       ${bPayments.p50} ms (p95: ${bPayments.p95} ms)`);
  console.log(`  5. Session Requery (End):  ${bSEnd.p50} ms (p95: ${bSEnd.p95} ms)`);
  console.log(`  6. Invoice Requery (End):  ${bIEnd.p50} ms (p95: ${bIEnd.p95} ms)`);
  console.log(`  >> Total Query Latency p50: ${beforeTotalP50.toFixed(2)} ms`);

  console.log("\nAFTER OPTIMIZATION (2 DB Round Trips):");
  console.log(`  1. Session Eager Relations: ${aSEager.p50} ms (p95: ${aSEager.p95} ms)`);
  console.log(`  2. Invoice with Relations:  ${aIEager.p50} ms (p95: ${aIEager.p95} ms)`);
  console.log(`  3. InvoiceLine findMany:   ELIMINATED (In-memory)`);
  console.log(`  4. Payment findMany:       ELIMINATED (In-memory)`);
  console.log(`  5. Session Requery (End):  ELIMINATED (Known relations)`);
  console.log(`  6. Invoice Requery (End):  ELIMINATED (Known relations)`);
  console.log(`  >> Total Query Latency p50: ${afterTotalP50.toFixed(2)} ms`);

  console.log("\nIMPROVEMENT SUMMARY:");
  console.log(`  Latency Reduction:          -${(beforeTotalP50 - afterTotalP50).toFixed(2)} ms`);
  console.log(`  Speedup:                    ${(((beforeTotalP50 - afterTotalP50) / beforeTotalP50) * 100).toFixed(1)}% faster`);
  console.log("=================================================================\n");

  await prisma.$disconnect();
}

runOptimizedBenchmark().catch(console.error);
