import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { PROJECT_ROOT, readJson } from "../../tools/lib/project.mjs";

const manifest = await readJson("module.json");
const catalog = await readJson("packs/catalog.json");
const moduleId = manifest.id;
const DOCUMENT_CLASS_BY_PACK_TYPE = new Map([
  ["Item", "Item"],
  ["JournalEntry", "JournalEntry"],
  ["RollTable", "RollTable"],
]);

async function packRecords() {
  const sourceRoot = path.join(PROJECT_ROOT, "packs", "_source");
  const packs = (await readdir(sourceRoot)).sort();
  const records = new Map();
  for (const packId of packs) {
    const files = (await readdir(path.join(sourceRoot, packId))).filter((name) => name.endsWith(".json")).sort();
    const sources = [];
    for (const fileName of files) {
      sources.push([fileName.replace(/\.json$/u, ""), JSON.parse(await readFile(path.join(sourceRoot, packId, fileName), "utf8"))]);
    }
    records.set(packId, sources);
  }
  return records;
}

test("compiled packs are deterministic line JSON matching the sources", async () => {
  const records = await packRecords();
  const sourcePackIds = [...records.keys()].join(",");
  const manifestPackIds = manifest.packs.map((pack) => pack.name).sort().join(",");
  assert.equal(sourcePackIds, manifestPackIds);
  for (const pack of manifest.packs) {
    const packPath = path.join(PROJECT_ROOT, "packs", `${pack.name}-v2.db`);
    const lines = (await readFile(packPath, "utf8")).split("\n").filter(Boolean);
    const sources = records.get(pack.name);
    assert.equal(lines.length, sources.length, `${pack.name} document count`);
    const sorted = sources.slice().sort((left, right) => String(left[1]._id).localeCompare(String(right[1]._id)));
    for (const [index, line] of lines.entries()) {
      const parsed = JSON.parse(line);
      assert.equal(parsed._id, sorted[index][1]._id, `${pack.name} order`);
      assert.equal(parsed._key, undefined, `${pack.name} ships published documents without authoring keys`);
    }
  }
});

test("catalog stanzas mirror the sources, uuids, and the document count", async () => {
  const records = await packRecords();
  let total = 0;
  assert.equal(catalog.providerId, moduleId);
  assert.equal(catalog.version, "1.0.0");
  for (const pack of manifest.packs) {
    const stanza = catalog.packs.find((entry) => entry.id === pack.name);
    assert.ok(stanza, `${pack.name} catalog stanza`);
    const sources = records.get(pack.name);
    assert.equal(stanza.entries.length, sources.length, `${pack.name} entry count`);
    total += sources.length;
    const documentClass = DOCUMENT_CLASS_BY_PACK_TYPE.get(pack.type);
    for (const [slug, source] of sources) {
      const entry = stanza.entries.find((candidate) => candidate.id === slug);
      assert.ok(entry, `${pack.name}/${slug} catalog entry`);
      assert.equal(entry.title, source.name);
      assert.equal(entry.uuid, `Compendium.${moduleId}.${pack.name}.${documentClass}.${source._id}`);
      assert.equal(entry.version, catalog.version);
      assert.equal(entry.metadata.documentId, source._id);
    }
  }
  assert.equal(catalog.documentCount, total);
});

test("journal and table documents survive compilation with readable shapes", async () => {
  const records = await packRecords();
  for (const [packId, sources] of records) {
    for (const [slug, source] of sources) {
      if (packId === "world-elements") {
        const pages = source.pages;
        assert.ok(pages.length >= 1, `${slug} pages`);
        for (const page of pages) {
          assert.equal(page.type, "text");
          assert.match(page._id, /^[A-Za-z0-9]{16}$/u);
          assert.ok((page.text?.content ?? "").includes("<h1>"), `${slug} page content`);
        }
      }
      if (packId === "tables") {
        let position = 1;
        for (const result of source.results) {
          assert.deepEqual(result.range, [position, position]);
          assert.ok(result.description.length > 0, `${slug} result ${position}`);
          position += result.weight;
        }
        assert.equal(source.formula, `1d${source.results.length}`);
      }
    }
  }
});
