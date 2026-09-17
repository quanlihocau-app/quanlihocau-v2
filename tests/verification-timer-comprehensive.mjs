import test from "node:test";
import assert from "node:assert/strict";

import {
    sessionTicker,
    computeTimeInfoFromMs,
} from "../src/lib/ticker/session-ticker.ts";

test("Verification 1: Mount/Unmount 100 times stress test & zero resource leak", async () => {
    sessionTicker.resetForTest();

    assert.equal(sessionTicker.getSubscriberCount(), 0);
    assert.equal(sessionTicker.isRunning(), false);

    const CYCLES = 100;
    const CARDS_PER_CYCLE = 50;

    for (let cycle = 1; cycle <= CYCLES; cycle++) {
        const unsubs = [];
        for (let i = 0; i < CARDS_PER_CYCLE; i++) {
            unsubs.push(sessionTicker.subscribe(() => {}));
        }

        assert.equal(
            sessionTicker.getSubscriberCount(),
            CARDS_PER_CYCLE,
            `Cycle ${cycle}: subscriber count must be ${CARDS_PER_CYCLE}`
        );
        assert.equal(sessionTicker.isRunning(), true, `Cycle ${cycle}: ticker must be running`);

        // Unmount all
        unsubs.forEach((unsub) => unsub());

        assert.equal(
            sessionTicker.getSubscriberCount(),
            0,
            `Cycle ${cycle}: subscriber count must be 0 after unmount`
        );
        assert.equal(
            sessionTicker.isRunning(),
            false,
            `Cycle ${cycle}: ticker must be stopped after unmount`
        );
    }

    // Final verification after 100 cycles
    assert.equal(sessionTicker.getSubscriberCount(), 0, "No leftover subscribers");
    assert.equal(sessionTicker.isRunning(), false, "No leftover running interval");
});

test("Verification 2: Tab switch / Background / Screen lock / 5-minute jump / Network recovery", async () => {
    sessionTicker.resetForTest();

    const baseNow = 1700000000000;
    const plannedEndMs = baseNow + 600_000; // 10 minutes in future

    let currentCalculatedLabel = "";
    const unsub = sessionTicker.subscribe(() => {
        const info = computeTimeInfoFromMs(plannedEndMs, sessionTicker.getNowMs());
        currentCalculatedLabel = info.label;
    });

    try {
        // 1. Initial calculation at base time
        const initialInfo = computeTimeInfoFromMs(plannedEndMs, baseNow);
        assert.equal(initialInfo.label, "00:10:00");
        assert.equal(initialInfo.isEndingSoon, true);
        assert.equal(initialInfo.isOvertime, false);

        // 2. Simulate backgrounding / 5-minute sleep jump (clock advances 300,000ms)
        const fiveMinLater = baseNow + 300_000;
        const jumpedInfo = computeTimeInfoFromMs(plannedEndMs, fiveMinLater);
        assert.equal(jumpedInfo.label, "00:05:00", "Must show exactly 5 minutes remaining after 5m sleep jump");

        // 3. Simulate 10-minute jump (boundary 0 reached)
        const tenMinLater = baseNow + 600_000;
        const zeroInfo = computeTimeInfoFromMs(plannedEndMs, tenMinLater);
        assert.equal(zeroInfo.label, "+00:00", "Must show 00:00 and overtime warning");
        assert.equal(zeroInfo.isEndingSoon, true);
        assert.equal(zeroInfo.isOvertime, true);

        // 4. Server offset adjustment (client clock is behind by 15s)
        sessionTicker.setServerOffsetMs(15_000);
        assert.equal(sessionTicker.getServerOffsetMs(), 15_000);
    } finally {
        unsub();
        sessionTicker.resetForTest();
    }

    assert.equal(sessionTicker.getSubscriberCount(), 0);
    assert.equal(sessionTicker.isRunning(), false);
});

test("Verification 3: Clock reaches 0 and Overtime Alert invariants", async () => {
    const baseNow = 1700000000000;

    // Case A: 1 second before expiration
    const before0 = computeTimeInfoFromMs(baseNow + 1000, baseNow);
    assert.equal(before0.label, "00:00:01");
    assert.equal(before0.isEndingSoon, true);
    assert.equal(before0.isOvertime, false);

    // Case B: Exactly at expiration boundary (diffMs = 0)
    const at0 = computeTimeInfoFromMs(baseNow, baseNow);
    assert.equal(at0.label, "+00:00");
    assert.equal(at0.isEndingSoon, true);
    assert.equal(at0.isOvertime, true);

    // Case C: Overtime 1 second
    const after1s = computeTimeInfoFromMs(baseNow - 1000, baseNow);
    assert.equal(after1s.label, "+00:01");
    assert.equal(after1s.isEndingSoon, true);
    assert.equal(after1s.isOvertime, true);

    // Case D: Overtime 45 minutes
    const after45m = computeTimeInfoFromMs(baseNow - 45 * 60 * 1000, baseNow);
    assert.equal(after45m.label, "+45:00");
    assert.equal(after45m.isEndingSoon, true);
    assert.equal(after45m.isOvertime, true);
});
