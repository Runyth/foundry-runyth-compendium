import { readJson } from "./lib/project.mjs";

const manifest = await readJson("module.json");
const tag = process.env.GITHUB_REF_NAME ?? process.argv[2];
if (!tag) throw new Error("Release tag is unavailable.");
if (tag !== `v${manifest.version}`) throw new Error(`Tag ${tag} does not match module version v${manifest.version}.`);
console.log(`Release tag ${tag} matches module.json.`);
