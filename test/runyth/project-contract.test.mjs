import test from "node:test";
import assert from "node:assert/strict";
import { readJson } from "../../tools/lib/project.mjs";

test("template identity and version are internally consistent", async () => {
  const manifest = await readJson("module.json");
  const packageJson = await readJson("package.json");
  const config = await readJson("runyth.config.json");
  assert.equal(manifest.version, packageJson.version);
  assert.equal(config.template.version, "1.0.0");
  assert.equal(typeof config.template.source, "boolean");
});
