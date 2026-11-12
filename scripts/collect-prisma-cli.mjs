#!/usr/bin/env node
/**
 * Copy the Prisma CLI and its installed dependency tree into a folder the
 * standalone runner can merge into node_modules. Run this in the image build,
 * where node_modules matches the Linux platform of the runtime.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const destination = path.resolve(process.argv[2] || "prisma-cli");
const modulesDir = path.join(destination, "node_modules");
fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(modulesDir, { recursive: true });

const require = createRequire(path.join(process.cwd(), "package.json"));
const seen = new Set();

function copyPackage(name) {
    if (!name || seen.has(name)) return;
    let manifestPath;
    try {
        manifestPath = require.resolve(`${name}/package.json`);
    } catch {
        return;
    }
    seen.add(name);
    const sourceDir = path.dirname(manifestPath);
    const sourceModules = path.join(process.cwd(), "node_modules");
    const relative = path.relative(sourceModules, sourceDir);
    if (relative.startsWith("..")) return;
    fs.cpSync(sourceDir, path.join(modulesDir, relative), { recursive: true, dereference: true });
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    for (const dependency of Object.keys({
        ...manifest.dependencies,
        ...manifest.optionalDependencies,
    })) {
        copyPackage(dependency);
    }
}

for (const root of ["prisma", "dotenv", "@prisma/client", "@prisma/adapter-pg", "pg"]) {
    copyPackage(root);
}

const binDir = path.join(modulesDir, ".bin");
fs.mkdirSync(binDir, { recursive: true });
fs.symlinkSync("../prisma/build/index.js", path.join(binDir, "prisma"));
process.stdout.write(`Collected ${seen.size} packages into ${destination}\n`);
