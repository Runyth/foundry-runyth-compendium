import { readFile } from "node:fs/promises";
import path from "node:path";
import { PROJECT_ROOT, readJson } from "./lib/project.mjs";
import { sha256File } from "./lib/hash.mjs";
import { readZipEntries } from "./lib/zip.mjs";

const manifest = await readJson("module.json");
const dist = path.join(PROJECT_ROOT, "dist");
const installName = `${manifest.id}-v${manifest.version}.zip`;
const sourceName = `${manifest.id}-v${manifest.version}-source.zip`;
const checksumName = `${manifest.id}-v${manifest.version}-SHA256SUMS.txt`;
const checksums = new Map();
for (const line of (await readFile(path.join(dist, checksumName), "utf8")).trim().split("\n")) {
  const match = line.match(/^([a-f0-9]{64})\s{2}(.+)$/u);
  if (!match) throw new Error(`Invalid checksum line: ${line}`);
  checksums.set(match[2], match[1]);
}
for (const [name, expected] of checksums) {
  const actual = await sha256File(path.join(dist, name));
  if (actual !== expected) throw new Error(`Checksum mismatch for ${name}.`);
}

const installEntries = await readZipEntries(path.join(dist, installName));
const installPrefix = `${manifest.id}/`;
if (![...installEntries.keys()].every((name) => name.startsWith(installPrefix))) throw new Error("Install ZIP has an invalid root.");
const embeddedManifest = JSON.parse(installEntries.get(`${installPrefix}module.json`)?.toString("utf8") ?? "null");
if (embeddedManifest?.id !== manifest.id || embeddedManifest?.version !== manifest.version) throw new Error("Install ZIP manifest identity/version mismatch.");
const forbiddenInstall = ["node_modules/", ".git/", ".github/", "test/", "tests/", "tools/", "package.json", "package-lock.json"];
for (const name of installEntries.keys()) {
  const relative = name.slice(installPrefix.length);
  if (forbiddenInstall.some((entry) => relative === entry.replace(/\/$/, "") || relative.startsWith(entry))) throw new Error(`Forbidden install archive entry: ${name}`);
  if (relative.endsWith(".map")) throw new Error(`Source map in install archive: ${name}`);
}

const sourceEntries = await readZipEntries(path.join(dist, sourceName));
const sourcePrefix = `${manifest.id}-v${manifest.version}-source/`;
if (![...sourceEntries.keys()].every((name) => name.startsWith(sourcePrefix))) throw new Error("Source ZIP has an invalid root.");
for (const required of ["module.json", "package.json", "package-lock.json", "runyth.config.json", "tools/build.mjs", ".github/workflows/ci.yml"]) {
  if (!sourceEntries.has(`${sourcePrefix}${required}`)) throw new Error(`Source ZIP is missing ${required}.`);
}
console.log(`Release verification passed: ${installEntries.size} install files, ${sourceEntries.size} source files.`);
