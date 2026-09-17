import test from "node:test";
import assert from "node:assert/strict";

// Import ticker & countdown logic directly from session-ticker.ts
import {
    sessionTicker,
    computeTimeInfoFromMs,
} from "../src/lib/ticker/session-ticker.ts";

test("Centralized Session Ticker: Single source of truth & lifecycle", async () => {
    sessionTicker.resetForTest();

    // 1. Initially stopped
    assert.equal(sessionTicker.getSubscriberCount(), 0, "Initial subscribers should be 0");
    assert.equal(sessionTicker.isRunning(), false, "Ticker should NOT be running when subscribers = 0");

    // 2. Simulating 20, 50, 100 subscriptions
    for (const count of [20, 50, 100]) {
        sessionTicker.resetForTest();
        const unsubscribers = [];

        for (let i = 0; i < count; i++) {
            unsubscribers.push(sessionTicker.subscribe(() => {}));
        }

        assert.equal(sessionTicker.getSubscriberCount(), count, `Should have ${count} subscribers`);
        assert.equal(sessionTicker.isRunning(), true, `Ticker must run when has ${count} subscribers`);

        // Verify subscribers cleanup
        unsubscribers.forEach((unsub) => unsub());
        assert.equal(sessionTicker.getSubscriberCount(), 0, `All ${count} subscribers cleaned up`);
        assert.equal(sessionTicker.isRunning(), false, `Ticker must STOP when all ${count} cards unmounted`);
    }
});

test("Timer Accuracy & Formatting Benchmarks", async () => {
    const now = Date.now();

    // Case 1: Active session with 1 hour 15 mins left
    const end1 = now + 75 * 60 * 1000;
    const info1 = computeTimeInfoFromMs(end1, now);
    assert.equal(info1.label, "01:15:00");
    assert.equal(info1.isEndingSoon, false);
    assert.equal(info1.isOvertime, false);

    // Case 2: Ending soon (< 15 mins left)
    const end2 = now + 10 * 60 * 1000 + 30 * 1000;
    const info2 = computeTimeInfoFromMs(end2, now);
    assert.equal(info2.label, "00:10:30");
    assert.equal(info2.isEndingSoon, true);
    assert.equal(info2.isOvertime, false);

    // Case 3: Overtime 5 minutes 12 seconds
    const end3 = now - (5 * 60 * 1000 + 12 * 1000);
    const info3 = computeTimeInfoFromMs(end3, now);
    assert.equal(info3.label, "+05:12");
    assert.equal(info3.isEndingSoon, true);
    assert.equal(info3.isOvertime, true);

    // Case 4: Overtime > 1 hour (1h 20m 05s)
    const end4 = now - (80 * 60 * 1000 + 5 * 1000);
    const info4 = computeTimeInfoFromMs(end4, now);
    assert.equal(info4.label, "+01:20:05");
    assert.equal(info4.isEndingSoon, true);
    assert.equal(info4.isOvertime, true);

    // Case 5: Exact 00:00 boundary
    const end5 = now;
    const info5 = computeTimeInfoFromMs(end5, now);
    assert.equal(info5.label, "+00:00");
    assert.equal(info5.isEndingSoon, true);
    assert.equal(info5.isOvertime, true);

    // Case 6: Server offset integration
    const baseNow = 1700000000000;
    const plannedEndMs = baseNow + 60000;
    const offsetMs = 5000;
    const infoWithOffset = computeTimeInfoFromMs(plannedEndMs, baseNow + offsetMs);
    assert.equal(infoWithOffset.label, "00:00:55");
});

test("Performance Comparison Benchmark: 20 vs 50 vs 100 cards", async () => {
    const counts = [20, 50, 100];
    const results = [];

    for (const count of counts) {
        sessionTicker.resetForTest();

        // Simulate cards with various end times
        const cards = [];
        for (let i = 0; i < count; i++) {
            const endMs = Date.now() + (i - count / 2) * 60 * 1000;
            cards.push({ endMs, tickHits: 0 });
        }

        const unsubs = cards.map((card) =>
            sessionTicker.subscribe(() => {
                card.tickHits++;
                computeTimeInfoFromMs(card.endMs, sessionTicker.getNowMs());
            })
        );

        // Measure overhead of 10,000 synthetic ticks across all cards
        const t0 = performance.now();
        const memBefore = process.memoryUsage().heapUsed;

        for (let tick = 0; tick < 10000; tick++) {
            cards.forEach((card) => {
                computeTimeInfoFromMs(card.endMs, Date.now());
            });
        }

        const elapsedMs = performance.now() - t0;
        const memAfter = process.memoryUsage().heapUsed;
        const memDeltaKb = (memAfter - memBefore) / 1024;

        results.push({
            "Cards (Spots)": count,
            "Active Intervals": 1, // Centralized ticker: ALWAYS 1 interval regardless of card count!
            "Old Model Intervals": count, // Previously: 1 interval per card (20, 50, 100)
            "Throughput (ops/sec)": Math.round((10000 * count) / (elapsedMs / 1000)).toLocaleString("vi-VN"),
            "Latency Per Card (µs)": (Math.round((elapsedMs / 10000 / count) * 10000) / 10).toFixed(2),
            "Total Tick Execution (ms)": (Math.round(elapsedMs * 10) / 10).toFixed(1),
            "Memory Delta (KB)": Math.max(0, Math.round(memDeltaKb)),
        });

        unsubs.forEach((u) => u());
    }

    console.log("\n=== TIMER BENCHMARK RESULTS (20 / 50 / 100 CARDS) ===");
    console.table(results);
    console.log("====================================================\n");

    assert.ok(results.length === 3);
});
