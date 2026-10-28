import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { auditNavigation } from "./check-navigation.mjs";
import { isolatedEnvironment } from "./isolated-environment.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (!fs.existsSync(path.join(root, ".next/BUILD_ID"))) throw new Error("Run npm run build:isolated first.");
const reservation = net.createServer();
reservation.listen(0, "127.0.0.1");
await once(reservation, "listening");
const { port } = reservation.address();
await new Promise((resolve) => reservation.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const env = { ...isolatedEnvironment(root), NEXTAUTH_URL: origin, NEXT_PUBLIC_APP_URL: origin };
const child = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: root, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
child.stdout.on("data", (part) => { logs = (logs + part).slice(-12000); });
child.stderr.on("data", (part) => { logs = (logs + part).slice(-12000); });
const results = [];
const failures = [];
try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
        if (child.exitCode !== null) throw new Error("Isolated server exited early.");
        try { ready = (await fetch(`${origin}/login`, { signal: AbortSignal.timeout(1000) })).ok; } catch { /* waiting for owned server */ }
        if (ready) break;
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!ready) throw new Error("Isolated server did not start.");
    const audit = auditNavigation(root);
    // GET-only guest checks. No signups, payments, cron credentials, writes or SQL fixtures.
    const targets = [...audit.pages, ...audit.apis.map((route) => route === "/api/auth/[...nextauth]" ? "/api/auth/session" : route)]
        .map((route) => route.replace(/\[\[?[^\]]+\]\]?/g, "isolated-no-such-id"));
    targets.push("/sessions?sessionId=isolated-session", "/sessions/new?customerId=isolated-customer", "/invoices/isolated-invoice?returnTo=%2Finvoices%2Fhistory");
    for (const target of targets) {
        const response = await fetch(origin + target, { redirect: "manual", signal: AbortSignal.timeout(10000) });
        const location = response.headers.get("location");
        const allowed = response.status >= 200 && response.status < 400 || [401, 403, 405, 410].includes(response.status)
            || response.status === 400 && target.includes("isolated-no-such-id");
        if (!allowed) failures.push(`${target}: unexpected HTTP ${response.status}`);
        if (location) {
            // Next Route Handlers may use localhost as the request origin even
            // when the listener/Host is 127.0.0.1. Accept only that same port.
            const destination = new URL(location, origin);
            if (!["127.0.0.1", "localhost"].includes(destination.hostname) || destination.port !== String(port) || destination.protocol !== "http:") {
                throw new Error(`${target}: redirect left isolated server`);
            }
        }
        if (target.includes("?sessionId=") || target.includes("?customerId=") || target.includes("?returnTo=")) {
            const login = new URL(location || "", origin);
            if (login.pathname !== "/login" || login.searchParams.get("redirect") !== target) throw new Error(`${target}: login lost navigation context`);
        }
        results.push({ target, status: response.status, location: location ? new URL(location, origin).pathname + new URL(location, origin).search : null });
        await response.arrayBuffer();
    }
    fs.writeFileSync(path.join(root, "docs/navigation-guest-smoke.json"), JSON.stringify({ mode: "isolated guest GET-only; no database", passed: failures.length === 0, failures, results }, null, 2) + "\n");
    if (failures.length) throw new Error(failures.join("\n"));
    console.log(`PASS: ${results.length} isolated guest GET checks; deep-link queries preserved. No authenticated/data workflows tested.`);
} catch (error) {
    console.error(error.message);
    console.error(logs);
    process.exitCode = 1;
} finally {
    const exited = once(child, "exit");
    if (child.exitCode === null) { child.kill(); await exited; }
}
