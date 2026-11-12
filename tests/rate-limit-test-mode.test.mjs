import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

function load(file) {
    const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(source, { exports }, { filename: file });
    return exports;
}

const gate = load("src/lib/test-rate-limit.ts");

test("rate limit reset stays off in production even if the flag is set", () => {
    assert.equal(gate.isTestRateLimitControlEnabled({ NODE_ENV: "production", ALLOW_TEST_RATE_LIMIT_RESET: "1" }), false);
    assert.equal(gate.isTestRateLimitControlEnabled({ NODE_ENV: "test", ALLOW_TEST_RATE_LIMIT_RESET: "1" }), true);
    assert.equal(gate.isTestRateLimitControlEnabled({ NODE_ENV: "test" }), false);
});

test("reset route and proxy clear both stores only behind the production gate", () => {
    const route = fs.readFileSync("src/app/api/test/reset-rate-limits/route.ts", "utf8");
    const proxy = fs.readFileSync("src/proxy.ts", "utf8");
    assert.match(route, /isTestRateLimitControlEnabled/);
    assert.match(route, /DELETE FROM "RateLimitBucket"/);
    assert.match(route, /resetInMemoryRateLimit/);
    assert.match(proxy, /export function resetInMemoryRateLimit/);
    assert.match(proxy, /rateLimitMap\.clear/);
});
