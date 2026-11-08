import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { PROJECT_ROOT, pathExists } from "./lib/project.mjs";
import { stableJson } from "./lib/text.mjs";

function sourceArgument() {
  const index = process.argv.indexOf("--source");
  if (index < 0 || !process.argv[index + 1]) throw new Error("Usage: npm run template:sync -- --source <template-path>");
  return path.resolve(PROJECT_ROOT, process.argv[index + 1]);
}

async function json(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

const source = sourceArgument();
const manifest = await json(path.join(source, ".runyth/template-managed.json"));
const sourceConfig = await json(path.join(source, "runyth.config.json"));
const targetManifestPath = path.join(PROJECT_ROOT, ".runyth/template-managed.json");
if (await pathExists(targetManifestPath)) {
  const targetManifest = await json(targetManifestPath);
  const currentPaths = new Set(manifest.entries.map((entry) => entry.path));
  for (const previous of targetManifest.entries ?? []) {
    if (!currentPaths.has(previous.path) && ["replace", "replace-tree"].includes(previous.mode)) {
      await rm(path.join(PROJECT_ROOT, previous.path), { recursive: true, force: true });
    }
  }
}
for (const entry of manifest.entries) {
  const from = path.join(source, entry.path);
  const to = path.join(PROJECT_ROOT, entry.path);
  if (!(await pathExists(from))) throw new Error(`Template-managed source is missing: ${entry.path}`);
  if (entry.mode === "replace" || entry.mode === "replace-tree") {
    await rm(to, { recursive: true, force: true });
    await mkdir(path.dirname(to), { recursive: true });
    await cp(from, to, { recursive: true });
  } else if (entry.mode === "merge-package") {
    const sourcePackage = await json(from);
    const targetPackage = await json(to);
    targetPackage.type = sourcePackage.type;
    targetPackage.engines = sourcePackage.engines;
    targetPackage.packageManager = sourcePackage.packageManager;
    targetPackage.scripts = { ...targetPackage.scripts, ...sourcePackage.scripts };
    await writeFile(to, stableJson(targetPackage));
  } else {
    throw new Error(`Unsupported template sync mode: ${entry.mode}`);
  }
}
const statePath = path.join(PROJECT_ROOT, ".runyth/template-state.json");
const currentState = await pathExists(statePath) ? await json(statePath) : {};
await writeFile(statePath, stableJson({ ...currentState, repository: sourceConfig.template.repository, version: sourceConfig.template.version, source: false, lastSync: new Date().toISOString() }));
console.log(`Applied Runyth template ${sourceConfig.template.version}.`);
