import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadModule(path, modules, globals = {}) {
    const source = fs.readFileSync(new URL(path, import.meta.url), "utf8");
    const code = ts.transpileModule(source, {
        fileName: path,
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const exports = {};
    vm.runInNewContext(code, {
        exports,
        require: (name) => {
            if (!(name in modules)) throw new Error(`Unexpected dependency: ${name}`);
            return modules[name];
        },
        Buffer,
        process: { env: { NEXTAUTH_SECRET: "test-secret" } },
        ...globals,
    });
    return exports;
}

const signature = loadModule("../src/lib/session-signature.ts", { crypto, "node:crypto": crypto });

function sign(payload, secret = "test-secret") {
    const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const mac = crypto.createHmac("sha256", secret).update(data).digest("base64url");
    return `${data}.${mac}`;
}

test("a signed qa_session verifies and a garbage token does not", () => {
    const token = sign({
        userId: "staff-1",
        email: "hienql@hocau.com",
        role: "USER",
        name: "Hien",
        expiresAt: Date.now() + 60_000,
    });
    assert.equal(signature.verifySignedSession(token).userId, "staff-1");
    assert.equal(signature.verifySignedSession("not-a-session"), null);
    assert.equal(signature.verifySignedSession(`${token}x`), null);
    assert.equal(signature.verifySignedSession(sign({
        userId: "staff-1",
        email: "hienql@hocau.com",
        role: "USER",
        name: "Hien",
    }, "old-secret")), null);
});

test("an expired qa_session is ignored", () => {
    const token = sign({
        userId: "staff-1",
        email: "hienql@hocau.com",
        role: "USER",
        name: "Hien",
        expiresAt: Date.now() - 1_000,
    });
    assert.equal(signature.verifySignedSession(token), null);
});
