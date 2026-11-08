import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { PROJECT_ROOT, readJson, walkFiles } from "./lib/project.mjs";
import { matchesAny } from "./lib/glob.mjs";
import { runCommand } from "./lib/process.mjs";
import { sha256File } from "./lib/hash.mjs";
import { writeDeterministicZip } from "./lib/zip.mjs";

const config = await readJson("runyth.config.json");
const manifest = await readJson("module.json");
const dist = path.join(PROJECT_ROOT, "dist");
const staging = path.join(dist, "staging");
await rm(dist, { recursive: true, force: true });
await mkdir(staging, { recursive: true });

for (const step of config.build.preBuild ?? []) {
  if (!step.command || !Array.isArray(step.args ?? [])) throw new Error("Each preBuild step requires command and args.");
  await runCommand(step.command, step.args ?? [], { cwd: path.resolve(PROJECT_ROOT, step.cwd ?? ".") });
}

const allFiles = await walkFiles(PROJECT_ROOT);
const installFiles = allFiles.filter((file) => matchesAny(file, config.build.include) && !matchesAny(file, config.build.exclude));
const installRoot = path.join(staging, manifest.id);
for (const relativePath of installFiles) {
  const target = path.join(installRoot, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(path.join(PROJECT_ROOT, relativePath), target);
}

const installName = `${manifest.id}-v${manifest.version}.zip`;
const sourceName = `${manifest.id}-v${manifest.version}-source.zip`;
const sourceRoot = `${manifest.id}-v${manifest.version}-source`;
const installEntries = await Promise.all(installFiles.map(async (file) => ({ name: `${manifest.id}/${file}`, content: await readFile(path.join(PROJECT_ROOT, file)) })));
await writeDeterministicZip(path.join(dist, installName), installEntries);

const sourceFiles = allFiles.filter((file) => !matchesAny(file, config.build.sourceExclude) || file.endsWith(".env.example"));
const sourceEntries = await Promise.all(sourceFiles.map(async (file) => ({ name: `${sourceRoot}/${file}`, content: await readFile(path.join(PROJECT_ROOT, file)) })));
await writeDeterministicZip(path.join(dist, sourceName), sourceEntries);
await cp(path.join(PROJECT_ROOT, "module.json"), path.join(dist, "module.json"));

const checksumName = `${manifest.id}-v${manifest.version}-SHA256SUMS.txt`;
const checksumTargets = [installName, sourceName, "module.json"];
const checksums = [];
for (const name of checksumTargets) checksums.push(`${await sha256File(path.join(dist, name))}  ${name}`);
await writeFile(path.join(dist, checksumName), `${checksums.join("\n")}\n`);

const report = {
  schemaVersion: 1,
  moduleId: manifest.id,
  version: manifest.version,
  templateVersion: config.template.version,
  installArchive: installName,
  sourceArchive: sourceName,
  checksumFile: checksumName,
  installRoot: manifest.id,
  sourceRoot,
  installFiles: installFiles.length,
  sourceFiles: sourceFiles.length,
  reproducibleTimestamp: "1980-01-01T00:00:00Z"
};
await writeFile(path.join(dist, "build-report.json"), `${JSON.stringify(report, null, 2)}\n`);
await rm(staging, { recursive: true, force: true });
console.log(`Built ${installName} and ${sourceName}.`);
