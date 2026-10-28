import fs from "node:fs";
import path from "node:path";

export function isolatedEnvironment(root, inherited = process.env) {
    const env = { ...inherited };
    // Empty values deliberately mask .env entries; never print their values.
    for (const file of fs.readdirSync(root).filter((name) => /^\.env(?:\.|$)/.test(name))) {
        if (!fs.statSync(path.join(root, file)).isFile()) continue;
        for (const line of fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/)) {
            const key = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line)?.[1];
            if (key) env[key] = "";
        }
    }
    for (const key of Object.keys(env)) {
        if (/(?:SECRET|TOKEN|API_KEY|DATABASE_URL|GOOGLE_CLIENT|SPEEDSMS|SMS_PROVIDER|ZALO_ZNS|CRON_SECRET)/.test(key)) env[key] = "";
    }
    return Object.assign(env, {
        NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
        DATABASE_URL: "postgresql://isolated:isolated@127.0.0.1:9/build_no_database?connect_timeout=1",
        DIRECT_URL: "postgresql://isolated:isolated@127.0.0.1:9/build_no_database?connect_timeout=1",
        SHADOW_DATABASE_URL: "postgresql://isolated:isolated@127.0.0.1:9/build_no_database?connect_timeout=1",
        NEXTAUTH_URL: "http://127.0.0.1:3101", NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3101",
        NEXTAUTH_SECRET: "isolated-build-only-not-for-deployment",
        AUTH_SECRET: "isolated-build-only-not-for-deployment",
        SESSION_SECRET: "isolated-build-session-not-for-deployment",
        GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", BANK_WEBHOOK_SECRET: "", CRON_SECRET: "",
    });
}
