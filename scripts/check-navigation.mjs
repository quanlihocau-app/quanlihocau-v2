import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

// Source-only audit: never imports the app, loads .env, calls HTTP or opens SQL.
const walk = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]) : [];
const slash = (value) => value.replaceAll("\\", "/");
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const demoFiles = new Set([
    "src/app/preview/page.tsx", "src/app/prototype/mobile-pos/page.tsx",
    "src/components/landing/dual-phone-hero-mockup.tsx",
    "src/components/landing/interactive-app-showcase.tsx",
]);

export function auditNavigation(root) {
    const files = walk(path.join(root, "src")).filter((file) => /\.[jt]sx?$/.test(file) && !slash(file).includes("/generated/"));
    const routeFor = (file) => "/" + slash(path.relative(path.join(root, "src/app"), path.dirname(file)))
        .split("/").filter((part) => part && !part.startsWith("(") && !part.startsWith("@")).join("/");
    const pages = files.filter((file) => /[/\\]page\.[jt]sx?$/.test(file)).map(routeFor);
    const apis = files.filter((file) => /[/\\]route\.[jt]s$/.test(file)).map(routeFor);
    const parsed = files.map((file) => ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true));
    const references = [], errors = [], manual = [], demoControls = [];
    const ids = new Set();
    for (const source of parsed) {
        function visit(node) {
            if (ts.isJsxAttribute(node) && node.name.text === "id" && node.initializer && ts.isStringLiteral(node.initializer)) ids.add(node.initializer.text);
            ts.forEachChild(node, visit);
        }
        visit(source);
    }
    function matches(target, routes) {
        return routes.some((route) => new RegExp("^" + route.split("/").map((part) =>
            /^\[\[\.\.\./.test(part) ? ".*" : /^\[\.\.\./.test(part) ? ".+" : /^\[/.test(part) ? "[^/]+" : escape(part)
        ).join("/") + "/?$").test(target));
    }
    for (const source of parsed) {
        const file = slash(path.relative(root, source.fileName));
        const location = (node) => ({ file, line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1 });
        function check(node, kind) {
            if (!node) return;
            if (ts.isConditionalExpression(node)) { check(node.whenTrue, kind); check(node.whenFalse, kind); return; }
            let value;
            if (ts.isStringLiteralLike(node)) value = node.text;
            else if (ts.isTemplateExpression(node)) value = node.head.text + node.templateSpans.map((part) => "__dynamic__" + part.literal.text).join("");
            else { manual.push({ ...location(node), kind, reason: "Computed target: requires runtime verification" }); return; }
            if (!value || value === "#" || /^javascript:/i.test(value)) {
                errors.push({ ...location(node), kind, target: value, reason: "Empty or inert target" }); return;
            }
            if (value.startsWith("#")) {
                if (!ids.has(value.slice(1))) errors.push({ ...location(node), kind, target: value, reason: "Missing anchor ID in source" });
                return;
            }
            if (!value.startsWith("/") || value.startsWith("//")) return;
            const target = value.split(/[?#]/)[0];
            const routes = kind === "fetch" ? apis : pages;
            const asset = !target.includes("__dynamic__") && fs.existsSync(path.join(root, "public", target.slice(1)));
            if (matches(target, routes) || asset) references.push({ ...location(node), kind, target });
            else if (target.includes("__dynamic__")) manual.push({ ...location(node), kind, target, reason: "Dynamic suffix/path requires runtime verification" });
            else errors.push({ ...location(node), kind, target, reason: "No matching route or public asset" });
        }
        function visit(node) {
            if (ts.isJsxAttribute(node) && ["href", "backHref"].includes(node.name.text) && node.initializer) {
                check(ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer, "link");
            }
            if (ts.isPropertyAssignment(node) && ["href", "practiceUrl"].includes(node.name.getText(source))) check(node.initializer, "link");
            if (ts.isCallExpression(node) && /^(router\.(push|replace)|redirect|permanentRedirect|fetch|fetchJson)$/.test(node.expression.getText(source))) {
                check(node.arguments[0], node.expression.getText(source).startsWith("fetch") ? "fetch" : "navigate");
            }
            if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ["button", "Button", "IconButton"].includes(node.tagName.getText(source))) {
                const attrs = node.attributes.properties;
                const handled = attrs.some((attr) => ts.isJsxSpreadAttribute(attr) || ["onClick", "onPointerDown", "onMouseDown", "onTouchStart", "formAction", "form", "disabled"].includes(attr.name?.getText(source)));
                let ancestor = node.parent, inForm = false;
                while (ancestor) {
                    if (ts.isJsxElement(ancestor) && ancestor.openingElement.tagName.getText(source) === "form") inForm = true;
                    ancestor = ancestor.parent;
                }
                if (!handled && !inForm) {
                    const issue = { ...location(node), kind: "button", reason: "No event handler, form or disabled state" };
                    (demoFiles.has(file) ? demoControls : errors).push(issue);
                }
            }
            ts.forEachChild(node, visit);
        }
        visit(source);
    }
    return { pages, apis, references, errors, manual, demoControls };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const result = auditNavigation(root);
    console.log(`Navigation source audit: ${result.pages.length} pages, ${result.apis.length} APIs, ${result.references.length} resolved references.`);
    console.log(`Errors: ${result.errors.length}; runtime targets to review: ${result.manual.length}; inert demo controls: ${result.demoControls.length}.`);
    for (const issue of result.errors) console.error(`${issue.file}:${issue.line} ${issue.reason}: ${issue.target ?? issue.kind}`);
    const output = process.argv.indexOf("--json");
    if (output !== -1 && process.argv[output + 1]) fs.writeFileSync(process.argv[output + 1], JSON.stringify(result, null, 2) + "\n");
    process.exitCode = result.errors.length ? 1 : 0;
}
