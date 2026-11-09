import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { PROJECT_ROOT, readJson } from "../../tools/lib/project.mjs";
import { flattenJson } from "../../tools/lib/text.mjs";
import { canonicalContentHash } from "../../tools/module/lib/content-hash.mjs";

const manifest = await readJson("module.json");
const catalog = await readJson("packs/catalog.json");
const moduleId = manifest.id;
const CONTENT_LICENCE = "CC BY-SA 4.0";

async function sourceRecords() {
  const sourceRoot = path.join(PROJECT_ROOT, "packs", "_source");
  const packs = (await readdir(sourceRoot)).sort();
  const records = [];
  for (const packId of packs) {
    for (const fileName of (await readdir(path.join(sourceRoot, packId))).sort()) {
      if (!fileName.endsWith(".json")) continue;
      const record = JSON.parse(await readFile(path.join(sourceRoot, packId, fileName), "utf8"));
      records.push({ packId, fileName, record });
    }
  }
  return records;
}

test("every source record is a clean, licensed, deterministic agnostic document", async () => {
  const records = await sourceRecords();
  assert.ok(records.length > 0);
  const seenIds = new Set();
  const seenNames = new Set();
  for (const { packId, fileName, record } of records) {
    assert.match(record._id ?? "", /^[A-Za-z0-9]{16}$/u, `${packId}/${fileName} id`);
    assert.match(record._key ?? "", /^![a-z]+!/u, `${packId}/${fileName} authoring key`);
    assert.ok(record.name, `${packId}/${fileName} name`);
    assert.equal(record.folder, null, `${packId}/${fileName} folder`);
    assert.equal(typeof record.sort, "number", `${packId}/${fileName} sort`);
    assert.deepEqual(record.ownership, { default: 0 }, `${packId}/${fileName} ownership`);
    const keys = [...flattenJson(record).keys()];
    assert.ok(!keys.some((key) => key === "system" || key.startsWith("system.")), `${packId}/${fileName} must stay agnostic`);
    assert.ok(!keys.some((key) => key.startsWith("_stats")), `${packId}/${fileName} stays deterministic`);
    const provider = record.flags?.[moduleId];
    assert.ok(provider, `${packId}/${fileName} provider flags`);
    assert.equal(provider.schemaVersion, 1, `${packId}/${fileName} schemaVersion`);
    assert.equal(provider.managed, true, `${packId}/${fileName} managed`);
    assert.equal(provider.contentVersion, catalog.version, `${packId}/${fileName} contentVersion`);
    assert.equal(provider.contentLicence, CONTENT_LICENCE, `${packId}/${fileName} content licence`);
    assert.equal(provider.provenance, "Runyth", `${packId}/${fileName} provenance`);
    assert.ok(provider.summary, `${packId}/${fileName} summary`);
    assert.equal(provider.contentHash, canonicalContentHash(record), `${packId}/${fileName} canonical hash`);
    assert.ok(!seenIds.has(record._id), `${packId}/${fileName} duplicate document id`);
    assert.ok(!seenNames.has(record.name), `${packId}/${fileName} duplicate name`);
    seenIds.add(record._id);
    seenNames.add(record.name);
  }
  assert.equal(records.length, 24);
  assert.equal(seenIds.size, 24);
});

test("armory and features ship agnostic item and feat documents without images", async () => {
  const records = await sourceRecords();
  for (const { packId, record } of records.filter((entry) => ["armory", "features"].includes(entry.packId))) {
    assert.ok(["item", "feat"].includes(record.type), `${packId} type`);
    assert.deepEqual(record.effects, [], `${record.name} effects`);
    assert.equal(record.img, undefined, `${record.name} stays imageless`);
  }
});
