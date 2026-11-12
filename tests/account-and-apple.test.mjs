import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(file) {
    const absolute = path.resolve(file);
    const code = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(code, {
        exports,
        Buffer,
        require: (name) => {
            if (name === "node:crypto" || name === "crypto") return { default: crypto };
            throw new Error(name);
        },
    }, { filename: absolute });
    return exports;
}

const deletion = load("src/lib/account-deletion.ts");
const identity = load("src/lib/apple-identity.ts");
const secret = load("src/lib/apple-client-secret.ts");
const commerce = load("src/lib/platform/commerce-visibility.ts");

test("xóa tài khoản đòi đúng câu và đúng mật khẩu", () => {
    assert.equal(deletion.deletionDecision({ phrase: "xoa", hasPassword: true, passwordOk: true }).ok, false);
    assert.equal(deletion.deletionDecision({ phrase: "XOA TAI KHOAN", hasPassword: true, passwordOk: false }).ok, false);
    assert.equal(deletion.deletionDecision({ phrase: "XOA TAI KHOAN", hasPassword: false, passwordOk: false }).ok, true);
    const fields = deletion.anonymizedUserFields("abc-123", new Date("2026-11-12T00:00:00.000Z"));
    assert.equal(fields.email, "deleted+abc-123@da-xoa.quanlihocau.invalid");
    assert.equal(fields.phone, null);
    assert.equal(fields.passwordHash, null);
    assert.equal(fields.isLocked, true);
    assert.equal(fields.name, "Tài khoản đã xóa");
});

test("token Apple giả bị từ chối khi sai iss, aud hoặc hết hạn", () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const jwk = publicKey.export({ format: "jwk" });
    jwk.kid = "TEST";
    const now = 1_700_000_000;
    function token(claims) {
        const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: "TEST" })).toString("base64url");
        const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
        const data = `${header}.${payload}`;
        const signature = crypto.sign("sha256", Buffer.from(data), { key: privateKey, dsaEncoding: "ieee-p1363" });
        return `${data}.${signature.toString("base64url")}`;
    }
    const good = token({
        iss: "https://appleid.apple.com",
        aud: "com.quanlihocau.app",
        exp: now + 60,
        sub: "apple-user",
        email: "owner@example.com",
    });
    assert.equal(identity.verifyAppleIdentityToken(good, {
        audiences: ["com.quanlihocau.app"],
        keys: [jwk],
        nowSec: now,
    }).ok, true);
    const wrongIss = token({ iss: "https://evil.example", aud: "com.quanlihocau.app", exp: now + 60, sub: "apple-user" });
    assert.equal(identity.verifyAppleIdentityToken(wrongIss, {
        audiences: ["com.quanlihocau.app"],
        keys: [jwk],
        nowSec: now,
    }).ok, false);
    const pem = privateKey.export({ type: "pkcs8", format: "pem" });
    const clientSecret = secret.createAppleClientSecret({
        teamId: "TEAMID123",
        keyId: "KEYID12345",
        clientId: "com.quanlihocau.web",
        privateKeyPem: pem,
        nowSec: now,
    });
    const payload = JSON.parse(Buffer.from(clientSecret.split(".")[1], "base64url").toString("utf8"));
    assert.equal(payload.aud, "https://appleid.apple.com");
    assert.equal(payload.sub, "com.quanlihocau.web");
});

test("iOS native ẩn mua gói, Android và trình duyệt vẫn hiện", () => {
    assert.equal(commerce.shouldShowSaasPurchase({ capacitorPlatform: "ios" }), false);
    assert.equal(commerce.shouldShowSaasPurchase({ userAgent: "Mozilla QuanLiHoCauNative/ios" }), false);
    assert.equal(commerce.shouldShowSaasPurchase({ capacitorPlatform: "android", userAgent: "QuanLiHoCauNative/android" }), true);
    assert.equal(commerce.shouldShowSaasPurchase({ userAgent: "Mozilla/5.0" }), true);
    const banner = fs.readFileSync("src/components/subscription/subscription-alert-banner.tsx", "utf8");
    assert.match(banner, /saas-purchase/);
    const session = fs.readFileSync("src/app/sessions/session-actions.tsx", "utf8");
    assert.doesNotMatch(session, /saas-purchase/);
});
