import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { PROJECT_ROOT, readJson, walkFiles } from "../../tools/lib/project.mjs";
import { matchesAny } from "../../tools/lib/glob.mjs";

test("Compendium records avoid stray identity, workstation and private-campaign material", async () => {
  const composed = (...parts) => parts.join("");
  const forbidden = [
    new RegExp(`${composed("gh", "p", "osr")}_[A-Za-z0-9]{20,}`, "u"),
    new RegExp(composed("github", "_pat_") + "[A-Za-z0-9_]{20,}", "u"),
    new RegExp(composed("x-ac", "cess-", "to", "ken"), "iu"),
    new RegExp(composed("-----BEGIN ", "RSA |OPENSSH |") + "PRIVATE KEY-----", "u"),
    new RegExp(composed("or", "phan") + "[\\s_-]*" + composed("bl", "ack"), "iu"),
    /\/mnt\//u,
    /\/home\/[a-z]/u,
  ];
  const allowed = ["node_modules/", "dist/", ".git/", ".build/", "test/compendium/publication.test.mjs", "docs/MODULE_ADOPTION_MATRIX.md"];
  const failures = [];
  for (const file of await walkFiles(PROJECT_ROOT)) {
    if (allowed.some((entry) => matchesAny(file, [entry]))) continue;
    if (!["", ".mjs", ".js", ".json", ".md", ".yml", ".yaml", ".db", ".txt"].includes(path.extname(file))) continue;
    const content = (await readFile(path.join(PROJECT_ROOT, file), "utf8")).replaceAll("\\r\\n", "\n");
    for (const pattern of forbidden) {
      if (pattern.test(content)) failures.push(`${file}: ${pattern}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("template identity is fully replaced in the managed identity surfaces", async () => {
  const manifest = await readJson("module.json");
  const packageJson = await readJson("package.json");
  const lock = JSON.parse(await readFile(path.join(PROJECT_ROOT, "package-lock.json"), "utf8"));
  const config = await readJson("runyth.config.json");
  for (const document of [manifest, packageJson, lock]) {
    assert.doesNotMatch(JSON.stringify(document), /foundry-module-template|runyth-module-template/iu);
  }
  assert.equal(config.module.repository, "Runyth/foundry-runyth-compendium");
  assert.equal(config.template.source, false);
  assert.notEqual(config.template.repository, "Runyth/foundry-runyth-compendium");
});
