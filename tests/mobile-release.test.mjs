import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("workflow Android và iOS chỉ bấm tay và không ghi secret", () => {
    for (const file of [".github/workflows/android-release.yml", ".github/workflows/ios-release.yml"]) {
        const text = fs.readFileSync(file, "utf8");
        const header = text.split(/^jobs:/m)[0].replace(/#[^\n]*/g, "");
        assert.match(header, /workflow_dispatch/, file);
        assert.doesNotMatch(header, /^\s*push:/m, file);
        assert.doesNotMatch(header, /^\s*pull_request:/m, file);
        assert.doesNotMatch(text, /BEGIN (RSA |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}/, file);
    }
    const android = fs.readFileSync(".github/workflows/android-release.yml", "utf8");
    assert.match(android, /bundleRelease/);
    assert.match(android, /ANDROID_KEYSTORE_BASE64/);
    const ios = fs.readFileSync(".github/workflows/ios-release.yml", "utf8");
    assert.match(ios, /macos-latest/);
    assert.match(ios, /-exportArchive/);
    assert.match(ios, /\.ipa/);
    assert.match(ios, /IOS_CERTIFICATE_P12_BASE64/);
    assert.ok(fs.existsSync("android/app/build.gradle"));
    assert.ok(fs.existsSync("ios/App/App.xcodeproj/project.pbxproj"));
    assert.match(fs.readFileSync("android/app/src/main/java/com/quanlihocau/app/MainActivity.java", "utf8"), /ThermalPrinterPlugin/);
    assert.match(fs.readFileSync("ios/App/App/NativePlugins.swift", "utf8"), /CBCentralManager/);
});
