import { PrismaClient } from "../src/generated/prisma/index.js";
import { performance } from "perf_hooks";

const prisma = new PrismaClient();

async function runBenchmark() {
  const lake = await prisma.lake.findFirst({
    where: { name: "hô cá" },
    select: { id: true, name: true, ownerId: true }
  });

  if (!lake) {
    console.error("Lake 'hô cá' not found");
    await prisma.$disconnect();
    return;
  }

  const session = await prisma.fishingSession.findFirst({
    where: { lakeId: lake.id },
    orderBy: { createdAt: "desc" },
    include: {
      hutLinks: { select: { hutId: true } },
      customer: { select: { name: true, phoneNormalized: true } },
      package: { select: { id: true, name: true, durationMinutes: true, priceVnd: true, overtimeHourlyVnd: true } },
      invoices: { include: { lines: true, payments: true } }
    }
  });

  if (!session) {
    console.error("No session found for lake");
    await prisma.$disconnect();
    return;
  }

  console.log(`Found session: ${session.id}, status: ${session.status}, lakeId: ${lake.id}`);

  // Let's measure each individual query that currently happens in settlement
  const invoiceId = session.invoices[0]?.id;
  console.log(`Associated invoiceId: ${invoiceId}`);

  const timings = {
    sessionQuery: [],
    invoiceFirst: [],
    invoiceLines: [],
    invoicePayments: [],
    invoiceRequeryFinal: [],
    sessionRequery: [],
    combinedInvoiceWithRelations: []
  };

  const ITERATIONS = 15;

  for (let i = 0; i < ITERATIONS; i++) {
    // 1. Session query
    let t0 = performance.now();
    await prisma.fishingSession.findFirst({
      where: { id: session.id, lakeId: lake.id },
      include: {
        hutLinks: { select: { hutId: true } },
        customer: { select: { name: true, phoneNormalized: true } },
        package: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            priceVnd: true,
            overtimeHourlyVnd: true
          }
        }
      }
    });
    timings.sessionQuery.push(performance.now() - t0);

    // 2. Original approach: findFirst invoice (no include)
    t0 = performance.now();
    const inv = await prisma.invoice.findFirst({
      where: { fishingSessionId: session.id, lakeId: lake.id }
    });
    timings.invoiceFirst.push(performance.now() - t0);

    if (inv) {
      // 3. Original approach: findMany invoiceLine
      t0 = performance.now();
      await prisma.invoiceLine.findMany({
        where: { invoiceId: inv.id }
      });
      timings.invoiceLines.push(performance.now() - t0);

      // 4. Original approach: findMany payment
      t0 = performance.now();
      await prisma.payment.findMany({
        where: { invoiceId: inv.id }
      });
      timings.invoicePayments.push(performance.now() - t0);

      // 5. Original approach: Requery invoice with include at the end (receiptData)
      t0 = performance.now();
      await prisma.invoice.findFirst({
        where: { fishingSessionId: session.id, lakeId: lake.id },
        include: { lines: true, payments: true }
      });
      timings.invoiceRequeryFinal.push(performance.now() - t0);

      // 6. Optimized approach: Single invoice query with relations
      t0 = performance.now();
      await prisma.invoice.findFirst({
        where: { fishingSessionId: session.id, lakeId: lake.id },
        include: { lines: true, payments: true }
      });
      timings.combinedInvoiceWithRelations.push(performance.now() - t0);
    }

    // 7. Session requery at the end
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
    timings.sessionRequery.push(performance.now() - t0);
  }

  function calcStats(arr) {
    if (!arr.length) return { mean: 0, p50: 0, p95: 0 };
    const sorted = [...arr].sort((a, b) => a - b);
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    return { mean: mean.toFixed(2), p50: p50.toFixed(2), p95: p95.toFixed(2) };
  }

  console.log("\n=== SETTLEMENT QUERY BREAKDOWN (15 runs) ===");
  console.log("1. session query:                   ", calcStats(timings.sessionQuery));
  console.log("2. invoice.findFirst (no include):  ", calcStats(timings.invoiceFirst));
  console.log("3. invoiceLine.findMany:            ", calcStats(timings.invoiceLines));
  console.log("4. payment.findMany:                ", calcStats(timings.invoicePayments));
  console.log("5. invoice.findFirst (re-query end):", calcStats(timings.invoiceRequeryFinal));
  console.log("6. session.findUnique (requery end):", calcStats(timings.sessionRequery));
  console.log("--- OPTIMIZED INVOICE QUERY ---");
  console.log("Single findFirst with include:      ", calcStats(timings.combinedInvoiceWithRelations));

  const origInvoiceTotal =
    parseFloat(calcStats(timings.invoiceFirst).p50) +
    parseFloat(calcStats(timings.invoiceLines).p50) +
    parseFloat(calcStats(timings.invoicePayments).p50) +
    parseFloat(calcStats(timings.invoiceRequeryFinal).p50);

  const optInvoiceTotal = parseFloat(calcStats(timings.combinedInvoiceWithRelations).p50);

  console.log("\nTotal Invoice Queries p50:");
  console.log(`- Original (4 separate round-trips): ${origInvoiceTotal.toFixed(2)} ms`);
  console.log(`- Optimized (1 single round-trip):   ${optInvoiceTotal.toFixed(2)} ms`);
  console.log(`- Estimated Savings:                 ${(origInvoiceTotal - optInvoiceTotal).toFixed(2)} ms (${(((origInvoiceTotal - optInvoiceTotal) / origInvoiceTotal) * 100).toFixed(1)}% reduction in invoice queries)`);

  await prisma.$disconnect();
}

runBenchmark().catch(console.error);
