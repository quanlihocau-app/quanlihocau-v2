import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(file, cache = new Map()) {
    const absolute = path.resolve(file);
    if (cache.has(absolute)) return cache.get(absolute);
    const source = fs.readFileSync(absolute, "utf8");
    const code = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    const dirname = path.dirname(absolute);
    vm.runInNewContext(code, {
        exports,
        require: (name) => {
            if (!name.startsWith(".")) throw new Error(`Unexpected import ${name}`);
            const target = path.resolve(dirname, name.endsWith(".ts") ? name : `${name}.ts`);
            return load(target, cache);
        },
    });
    cache.set(absolute, exports);
    return exports;
}

const expiry = load("src/lib/subscription-expiry.ts");
const access = load("src/lib/subscription-access.ts");
const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-12T17:00:00.000Z");

function classify(status, expiresAt, deletedAt = null) {
    return expiry.classifySubscriptionExpiry({
        now,
        graceMs: access.SUBSCRIPTION_GRACE_MS,
        status,
        expiresAt,
        deletedAt,
    });
}

test("hồ dùng thử quá hạn một ngày vào ân hạn, chạy lại thì đứng yên", () => {
    assert.equal(classify("TRIAL", new Date(now.getTime() - DAY)), "GRACE_PERIOD");
    assert.equal(classify("ACTIVE", new Date(now.getTime() - 2 * DAY)), "GRACE_PERIOD");
    assert.equal(classify("GRACE_PERIOD", new Date(now.getTime() - DAY)), null);
});

test("quá 3 ngày ân hạn thì khóa, kể cả đang ân hạn, và lần sau không chọn lại", () => {
    const past = new Date(now.getTime() - 4 * DAY);
    assert.equal(classify("TRIAL", past), "SUSPENDED");
    assert.equal(classify("ACTIVE", past), "SUSPENDED");
    assert.equal(classify("GRACE_PERIOD", past), "SUSPENDED");
    assert.equal(classify("SUSPENDED", past), null);
});

test("còn hạn, chưa có ngày, hoặc hồ đã xóa thì không đụng", () => {
    assert.equal(classify("ACTIVE", new Date(now.getTime() + DAY)), null);
    assert.equal(classify("TRIAL", null), null);
    assert.equal(classify("TRIAL", new Date(now.getTime() - 5 * DAY), new Date()), null);
});

test("cửa sổ ân hạn dùng đúng hằng số 3 ngày", () => {
    const windows = expiry.subscriptionExpiryWindows(now, access.SUBSCRIPTION_GRACE_MS);
    assert.equal(windows.graceCutoff.toISOString(), new Date(now.getTime() - 3 * DAY).toISOString());
    assert.equal(access.SUBSCRIPTION_GRACE_DAYS, 3);
});

test("cron Vercel đã gỡ và lịch VPS là 00:00 giờ Việt Nam, có khóa", () => {
    const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
    assert.equal(vercel.crons, undefined);
    const crontab = fs.readFileSync("deploy/scheduler/crontab", "utf8");
    assert.match(crontab, /CRON_TZ=Asia\/Ho_Chi_Minh/);
    assert.match(crontab, /^0 0 \* \* \* \/scripts\/subscriptions-cron\.sh$/m);
    const script = fs.readFileSync("deploy/scripts/subscriptions-cron.sh", "utf8");
    assert.match(script, /CRON_SECRET/);
    assert.match(script, /APP_BASE_URL/);
    assert.match(script, /Authorization: Bearer/);
    assert.match(script, /\/api\/cron\/subscriptions/);
    assert.doesNotMatch(script, /sk_live|postgres:\/\/\w+:[^@\s]+@/);
    const route = fs.readFileSync("src/app/api/cron/subscriptions/route.ts", "utf8");
    assert.match(route, /GRACE_FROM_STATUSES/);
    assert.match(route, /SUSPEND_FROM_STATUSES/);
    assert.match(route, /subscriptionExpiryWindows/);
});
