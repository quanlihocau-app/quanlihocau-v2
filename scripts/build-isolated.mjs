import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isolatedEnvironment } from "./isolated-environment.mjs";

// Compile only. Do not run migrations, seed, integration tests or deployment.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = isolatedEnvironment(root);
console.log("Isolated compile: loopback-only database placeholder; integration credentials cleared. No migration or deployment.");
const result = spawnSync(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "build"], { cwd: root, env, stdio: "inherit" });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
