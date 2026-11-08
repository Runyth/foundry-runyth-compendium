import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PROJECT_ROOT, readJson } from "./lib/project.mjs";
import { stableJson } from "./lib/text.mjs";

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    result[key] = values[index + 1];
    index += 1;
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));
for (const key of ["id", "title", "description", "repository"]) {
  if (!args[key]) throw new Error(`Missing --${key}.`);
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(args.id)) throw new Error("--id must be lowercase kebab-case.");
if (!/^Runyth\/[A-Za-z0-9._-]+$/u.test(args.repository)) throw new Error("--repository must be Runyth/<repository>.");

const manifest = await readJson("module.json");
const packageJson = await readJson("package.json");
const lock = await readJson("package-lock.json");
const config = await readJson("runyth.config.json");
if (!config.template.source && !process.argv.includes("--force")) throw new Error("This repository is already bootstrapped. Use --force only for deliberate identity replacement.");
const repositoryUrl = `https://github.com/${args.repository}`;
manifest.id = args.id;
manifest.title = args.title;
manifest.description = args.description;
manifest.url = repositoryUrl;
manifest.manifest = `${repositoryUrl}/releases/latest/download/module.json`;
manifest.download = `${repositoryUrl}/releases/download/v${manifest.version}/${args.id}-v${manifest.version}.zip`;
manifest.readme = `${repositoryUrl}/blob/main/README.md`;
manifest.changelog = `${repositoryUrl}/blob/main/CHANGELOG.md`;
manifest.bugs = `${repositoryUrl}/issues`;
packageJson.name = `@runyth/${args.id}`;
packageJson.description = args.description;
packageJson.repository.url = `git+${repositoryUrl}.git`;
lock.name = packageJson.name;
lock.packages[""].name = packageJson.name;
config.template.source = false;
config.template.repository = "Runyth/foundry-module-template";
config.module.kind = args.kind ?? "runtime";
config.module.repository = args.repository;

const mainPath = path.join(PROJECT_ROOT, "scripts/main.js");
const mainSource = (await readFile(mainPath, "utf8")).replaceAll("foundry-module-template", args.id);
await writeFile(mainPath, mainSource);

const localizationKey = args.id.replaceAll("-", "_").toUpperCase();
for (const relativePath of ["lang/en.json", "lang/de.json"]) {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  const document = JSON.parse(await readFile(fullPath, "utf8"));
  const originalKey = Object.keys(document)[0];
  const values = document[originalKey] ?? {};
  await writeFile(fullPath, stableJson({ [localizationKey]: { ...values, Name: args.title } }));
}

const readme = `# ${args.title}\n\n${args.description}\n\n## Installation\n\nInstall the release ZIP through Foundry VTT or extract it into the Foundry \`Data/modules/\` directory.\n\n## Development\n\nThis repository follows the Runyth Foundry module standard. Run \`npm run check\` before submitting changes. See \`docs/REPOSITORY_STANDARD.md\` for repository and compatibility rules.\n\n## Releases\n\nEach release provides a ready-to-install module ZIP, a complete reproducible source ZIP, SHA-256 checksums, and the release manifest.\n`;
await writeFile(path.join(PROJECT_ROOT, "README.md"), readme);
await writeFile(path.join(PROJECT_ROOT, "module.json"), stableJson(manifest));
await writeFile(path.join(PROJECT_ROOT, "package.json"), stableJson(packageJson));
await writeFile(path.join(PROJECT_ROOT, "package-lock.json"), stableJson(lock));
await writeFile(path.join(PROJECT_ROOT, "runyth.config.json"), stableJson(config));
await writeFile(path.join(PROJECT_ROOT, ".runyth/template-state.json"), stableJson({ repository: config.template.repository, version: config.template.version, source: false, lastSync: null }));
console.log(`Bootstrapped ${args.repository} as module ${args.id}.`);
