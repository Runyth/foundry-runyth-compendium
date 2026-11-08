import { readFile, writeFile } from "node:fs/promises";
import { PROJECT_ROOT, readJson } from "./lib/project.mjs";
import { stableJson } from "./lib/text.mjs";
import path from "node:path";

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version ?? "")) throw new Error("Usage: npm run version:set -- <semantic-version>");
const manifest = await readJson("module.json");
const packageJson = await readJson("package.json");
const lock = await readJson("package-lock.json");
manifest.version = version;
manifest.download = manifest.download.replace(/\/v[^/]+\/[^/]+$/u, `/v${version}/${manifest.id}-v${version}.zip`);
packageJson.version = version;
lock.version = version;
if (lock.packages?.[""]) lock.packages[""].version = version;
await writeFile(path.join(PROJECT_ROOT, "module.json"), stableJson(manifest));
await writeFile(path.join(PROJECT_ROOT, "package.json"), stableJson(packageJson));
await writeFile(path.join(PROJECT_ROOT, "package-lock.json"), stableJson(lock));

const changelogPath = path.join(PROJECT_ROOT, "CHANGELOG.md");
let changelog = await readFile(changelogPath, "utf8");
if (!changelog.includes(`## [${version}]`)) {
  const date = new Date().toISOString().slice(0, 10);
  changelog = changelog.replace("## [Unreleased]\n", `## [Unreleased]\n\n## [${version}] - ${date}\n\n- Describe this release.\n`);
  await writeFile(changelogPath, changelog);
}
console.log(`Set module version to ${version}.`);
