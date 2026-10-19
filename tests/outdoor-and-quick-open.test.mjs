import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

test("1. Chế độ ngoài trời độ tương phản cao (Outdoor High-Contrast CSS)", () => {
    const cssPath = path.join(rootDir, "src/app/globals.css");
    const css = fs.readFileSync(cssPath, "utf8");

    // Phải có class .outdoor-high-contrast
    assert.ok(css.includes(".outdoor-high-contrast"), "Thiếu selector .outdoor-high-contrast trong globals.css");
    // Phải ưu tiên nền sáng chữ đen đậm
    assert.ok(css.includes("--background: #FFFFFF"), "Thiếu nền sáng trong outdoor mode");
    assert.ok(css.includes("--foreground: #000000"), "Thiếu chữ đen đậm trong outdoor mode");
    // Viền đậm và tương phản rõ nét
    assert.ok(css.includes(".hut-selected-outdoor"), "Thiếu class hut-selected-outdoor");
    assert.ok(css.includes(".hut-available-outdoor"), "Thiếu class hut-available-outdoor");
    assert.ok(css.includes(".hut-occupied-outdoor"), "Thiếu class hut-occupied-outdoor");
});

test("2. Hook useOutdoorMode đồng bộ trạng thái và lưu localStorage", () => {
    const hookPath = path.join(rootDir, "src/hooks/use-outdoor-mode.ts");
    const hookCode = fs.readFileSync(hookPath, "utf8");

    assert.ok(hookCode.includes("pos_outdoor_mode"), "Thiếu localStorage key pos_outdoor_mode");
    assert.ok(hookCode.includes("outdoor-mode-change"), "Thiếu custom event outdoor-mode-change");
    assert.ok(hookCode.includes("outdoor-high-contrast"), "Thiếu gắn class outdoor-high-contrast vào document");
});

test("3. Button hỗ trợ size xl cho thao tác ngón tay ướt (chiều cao >= 56px)", () => {
    const buttonPath = path.join(rootDir, "src/components/ui/button.tsx");
    const buttonCode = fs.readFileSync(buttonPath, "utf8");

    assert.ok(buttonCode.includes('"xl"'), "Thiếu size xl trong Button component");
    assert.ok(buttonCode.includes("min-h-[56px]"), "Size xl phải có chiều cao tối thiểu 56px");
});

test("4. Luồng Mở vé nhanh (Quick Open) trong open-session-form.tsx", () => {
    const formPath = path.join(rootDir, "src/app/sessions/new/open-session-form.tsx");
    const formCode = fs.readFileSync(formPath, "utf8");

    // Phải có handleQuickOpen
    assert.ok(formCode.includes("handleQuickOpen"), "Thiếu hàm handleQuickOpen");
    // Phải có kiểm tra chòi bận
    assert.ok(formCode.includes("h.currentSessionId !== null"), "Thiếu kiểm tra chòi bận trong Quick Open");
    // Phải dùng gói mặc định hợp lệ
    assert.ok(formCode.includes("targetPackage"), "Thiếu xác định gói mặc định targetPackage");
    // Phải gửi customer mode GUEST khi mở nhanh
    assert.ok(formCode.includes('customer: { mode: "GUEST" }'), "Quick Open phải gửi customer mode GUEST");
    // Phải có Idempotency-Key chống tạo vé trùng
    assert.ok(formCode.includes('"Idempotency-Key": idempotencyKey'), "Quick Open phải có Idempotency-Key");
    // Phải có cờ inFlight và isQuickOpening chống bấm lặp
    assert.ok(formCode.includes("quickOpenInFlightRef"), "Thiếu quickOpenInFlightRef chống bấm lặp");
    assert.ok(formCode.includes("isQuickOpening"), "Thiếu state isQuickOpening");
    // Nút mở nhanh phải có min-h-[58px] đạt chuẩn 56px-64px
    assert.ok(formCode.includes("min-h-[58px]"), "Nút mở nhanh phải đạt chiều cao >= 56px");
    // Ô câu trong grid phải có min-h-[56px]
    assert.ok(formCode.includes("min-h-[56px] h-14 sm:h-16"), "Nút ô câu phải có chiều cao min-h-[56px]");
});

test("5. Nút toggle Chế độ ngoài trời trên MobileAppHeader", () => {
    const headerPath = path.join(rootDir, "src/components/layout/mobile-app-header.tsx");
    const headerCode = fs.readFileSync(headerPath, "utf8");

    assert.ok(headerCode.includes("useOutdoorMode"), "Header phải import useOutdoorMode");
    assert.ok(headerCode.includes("toggleOutdoorMode"), "Header phải có nút toggleOutdoorMode");
});
