import assert from "node:assert/strict";
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
    vm.runInNewContext(code, { exports, Buffer, require: () => { throw new Error("no import"); } }, { filename: absolute });
    return exports;
}

const commerce = load("src/lib/platform/commerce-visibility.ts");

test("iOS native ẩn mua gói, Android và web vẫn hiện", () => {
    assert.equal(commerce.shouldShowSaasPurchase({ capacitorPlatform: "ios" }), false);
    assert.equal(commerce.shouldShowSaasPurchase({ userAgent: "Mozilla QuanLiHoCauNative/ios" }), false);
    assert.equal(commerce.shouldShowSaasPurchase({ capacitorPlatform: "android", userAgent: "QuanLiHoCauNative/android" }), true);
    assert.equal(commerce.shouldShowSaasPurchase({ userAgent: "Mozilla/5.0" }), true);
});

test("nút gói phần mềm có class ẩn trên iOS, gia hạn giờ câu thì không", () => {
    for (const file of [
        "src/components/subscription/subscription-alert-banner.tsx",
        "src/components/subscription/subscription-modal.tsx",
        "src/app/settings/subscription-banner.tsx",
        "src/app/bang-gia/page.tsx",
        "src/components/landing/brand-landing-page.tsx",
    ]) {
        assert.match(fs.readFileSync(file, "utf8"), /saas-purchase/, file);
    }
    const fishingExtend = fs.readFileSync("src/app/sessions/session-actions.tsx", "utf8");
    assert.match(fishingExtend, /Gia hạn/);
    assert.doesNotMatch(fishingExtend, /saas-purchase/);
    const layout = fs.readFileSync("src/app/layout.tsx", "utf8");
    assert.match(layout, /QuanLiHoCauNative\/ios/);
});
