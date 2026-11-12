#!/usr/bin/env node
/**
 * Copy the Prisma CLI and its installed dependency tree into a folder the
 * standalone runner can merge into node_modules. Run this in the image build,
 * where node_modules matches the Linux platform of the runtime.
 *
 * Some packages (for example @prisma/studio-core) hide package.json behind
 * "exports", so require.resolve("name/package.json") fails. Look the file up
 * on disk instead, and stop the build if a dependency is not installed.
 */
import fs from "node:fs";
import path from "node:path";
import { builtinModules, createRequire } from "node:module";

const destination = path.resolve(process.argv[2] || "prisma-cli");
const modulesDir = path.join(destination, "node_modules");
fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(modulesDir, { recursive: true });

const require = createRequire(path.join(process.cwd(), "package.json"));
const seen = new Set();
const builtins = new Set(builtinModules);

function locatePackage(name) {
    const searchPaths = require.resolve.paths(name) ?? [];
    const relativeManifest = path.join(...name.split("/"), "package.json");
    const tried = [];
    for (const base of searchPaths) {
        const manifestPath = path.join(base, relativeManifest);
        tried.push(manifestPath);
        if (!fs.existsSync(manifestPath)) continue;
        let manifest;
        try {
            manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        } catch (error) {
            throw new Error(`collect-prisma-cli: không đọc được ${manifestPath}: ${error.message}`);
        }
        if (manifest.name !== name) {
            throw new Error(`collect-prisma-cli: ${manifestPath} có name ${manifest.name}, cần ${name}`);
        }
        return { manifestPath, sourceDir: path.dirname(manifestPath), manifest };
    }
    throw new Error(
        `collect-prisma-cli: thiếu package ${name}. Không dùng require.resolve("${name}/package.json") vì exports có thể che file này. Đã tìm:\n${tried.join("\n")}`,
    );
}

function copyPackage(name) {
    if (!name || seen.has(name) || builtins.has(name)) return;
    const { manifestPath, sourceDir, manifest } = locatePackage(name);
    seen.add(name);
    const sourceModules = path.join(process.cwd(), "node_modules");
    let relative = path.relative(sourceModules, sourceDir);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
        relative = name;
    }
    fs.cpSync(sourceDir, path.join(modulesDir, relative), { recursive: true, dereference: true });
    for (const dependency of Object.keys(manifest.dependencies ?? {})) {
        copyPackage(dependency);
    }
    for (const dependency of Object.keys(manifest.optionalDependencies ?? {})) {
        try {
            copyPackage(dependency);
        } catch (error) {
            if (!String(error.message).includes(`thiếu package ${dependency}`)) throw error;
            process.stderr.write(`collect-prisma-cli: bỏ qua optional ${dependency} vì máy build không cài gói đó\n`);
        }
    }
}

for (const root of ["prisma", "dotenv", "@prisma/client", "@prisma/adapter-pg", "pg"]) {
    copyPackage(root);
}

const bff = path.join(modulesDir, "@prisma/studio-core/dist/data/bff/index.js");
if (!fs.existsSync(bff)) {
    throw new Error(`collect-prisma-cli: đã copy package nhưng thiếu ${bff}`);
}

const binDir = path.join(modulesDir, ".bin");
fs.mkdirSync(binDir, { recursive: true });
fs.symlinkSync("../prisma/build/index.js", path.join(binDir, "prisma"));
process.stdout.write(`Collected ${seen.size} packages into ${destination}\n`);
