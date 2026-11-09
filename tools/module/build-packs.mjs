// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PROJECT_ROOT, readJson } from "../lib/project.mjs";
import { flattenJson, stableJson } from "../lib/text.mjs";
import { canonicalContentHash } from "./lib/content-hash.mjs";

const WRITE = process.argv.includes("--write");
const SOURCE_ROOT = path.join(PROJECT_ROOT, "packs", "_source");
const PACK_ROOT = path.join(PROJECT_ROOT, "packs");
const MODULE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const FOUNDRY_ID_PATTERN = /^[A-Za-z0-9]{16}$/u;
const CONTENT_LICENCE = "CC BY-SA 4.0";
const KEY_SPACE_BY_TYPE = new Map([
  ["Item", "!items!"],
  ["JournalEntry", "!journal!"],
  ["RollTable", "!tables!"],
]);
const DOCUMENT_CLASS_BY_TYPE = new Map([
  ["Item", "Item"],
  ["JournalEntry", "JournalEntry"],
  ["RollTable", "RollTable"],
]);
const KIND_BY_TYPE = new Map([
  ["Item", null],
  ["JournalEntry", "journal"],
  ["RollTable", "table"],
]);

function sortPlain(value) {
  if (Array.isArray(value)) return value.map(sortPlain);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortPlain(value[key])]));
}

function canonicalLine(value) {
  return JSON.stringify(sortPlain(value));
}

const manifest = await readJson("module.json");
const catalog = await readJson("packs/catalog.json");
const moduleId = manifest.id;
const contentVersion = catalog.version;
const packs = manifest.packs ?? [];

if (!MODULE_ID_PATTERN.test(moduleId)) throw new Error(`module.json id ${moduleId} is not kebab-case.`);
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(contentVersion)) throw new Error(`packs/catalog.json carries an invalid content version ${contentVersion}.`);
if (!packs.length) throw new Error("module.json must declare at least one pack.");

const manifestPackIds = packs.map((pack) => pack.name).sort();
const catalogPackIds = catalog.packs.map((pack) => pack.id).sort();
if (JSON.stringify(manifestPackIds) !== JSON.stringify(catalogPackIds)) {
  throw new Error(`Catalog packs [${catalogPackIds.join(", ")}] differ from manifest packs [${manifestPackIds.join(", ")}].`);
}

for (const pack of packs) {
  if (!KEY_SPACE_BY_TYPE.has(pack.type)) throw new Error(`Unsupported pack type ${pack.type} for pack ${pack.name}.`);
  if (pack.path !== `packs/${pack.name}-v2.db`) throw new Error(`Pack ${pack.name} must be declared at packs/${pack.name}-v2.db.`);
}

const documentIds = new Set();
const documentNames = new Set();
const compiledPacks = [];

for (const pack of packs) {
  const packId = pack.name;
  const type = pack.type;
  const keySpace = KEY_SPACE_BY_TYPE.get(type);
  const documentClass = DOCUMENT_CLASS_BY_TYPE.get(type);
  const forcedKind = KIND_BY_TYPE.get(type);
  const rendition = catalog.packs.find((entry) => entry.id === packId);
  if (!rendition) throw new Error(`Catalog lost its stanza for pack ${packId}.`);
  const fileNames = (await readdir(path.join(SOURCE_ROOT, packId))).filter((name) => name.endsWith(".json")).sort();
  if (!fileNames.length) throw new Error(`Pack ${packId} refuses to compile as an empty pack.`);

  const documents = [];
  const catalogEntries = [];
  for (const fileName of fileNames) {
    const slug = fileName.replace(/\.json$/u, "");
    const filePath = path.join(SOURCE_ROOT, packId, fileName);
    const source = JSON.parse(await readFile(filePath, "utf8"));

    if (!MODULE_ID_PATTERN.test(slug)) throw new Error(`${fileName}: entry slug must be kebab-case.`);
    if (!FOUNDRY_ID_PATTERN.test(source._id ?? "")) throw new Error(`${fileName}: invalid Foundry document ID.`);
    if (source._key !== `${keySpace}${source._id}`) throw new Error(`${fileName}: authoring key must be ${keySpace}<id>.`);
    if (typeof source.name !== "string" || source.name.length === 0) throw new Error(`${fileName}: name is required.`);
    if (documentIds.has(source._id)) throw new Error(`${fileName}: duplicate Foundry document ID ${source._id}.`);
    if (documentNames.has(source.name)) throw new Error(`${fileName}: duplicate document name ${source.name}.`);
    if (JSON.stringify(source.folder) !== "null") throw new Error(`${fileName}: agnostic records stay outside folders.`);
    if (!Number.isInteger(source.sort)) throw new Error(`${fileName}: sort must be an integer.`);
    if (JSON.stringify(source.ownership) !== JSON.stringify({ default: 0 })) throw new Error(`${fileName}: ownership must default to OBSERVER (0).`);

    const flattenedKeys = [...flattenJson(source).keys()];
    const systemKeys = flattenedKeys.filter((key) => key === "system" || key.startsWith("system."));
    if (systemKeys.length) throw new Error(`${fileName}: system-agnostic records must not carry ${systemKeys[0]}.`);
    const statsKeys = flattenedKeys.filter((key) => key.startsWith("_stats"));
    if (statsKeys.length) throw new Error(`${fileName}: deterministic agnostic records do not carry ${statsKeys[0]}.`);

    const providerFlags = source.flags?.[moduleId];
    if (!providerFlags || typeof providerFlags !== "object") throw new Error(`${fileName}: provider flags are required.`);
    if (providerFlags.schemaVersion !== 1) throw new Error(`${fileName}: provider flag schemaVersion must be 1.`);
    if (providerFlags.managed !== true) throw new Error(`${fileName}: provider flag managed must be true.`);
    if (providerFlags.entryId !== slug) throw new Error(`${fileName}: provider flag entryId must be ${slug}.`);
    if (providerFlags.contentVersion !== contentVersion) throw new Error(`${fileName}: contentVersion differs from the catalog.`);
    if (providerFlags.provenance !== "Runyth") throw new Error(`${fileName}: provenance must be Runyth.`);
    if (providerFlags.contentLicence !== CONTENT_LICENCE) throw new Error(`${fileName}: content licence must be ${CONTENT_LICENCE}.`);
    if (typeof providerFlags.summary !== "string" || providerFlags.summary.length === 0) throw new Error(`${fileName}: summary is required.`);

    if (type === "Item") {
      if (!["item", "feat"].includes(source.type)) throw new Error(`${fileName}: agnostic Item packs ship only item and feat documents.`);
      if (!Array.isArray(source.effects)) throw new Error(`${fileName}: agnostic Item documents need an effects array.`);
      if (source.img !== undefined && JSON.stringify(source.img) !== "null") throw new Error(`${fileName}: agnostic records let the owner world choose images.`);
    }
    if (type === "JournalEntry") {
      const pages = source.pages;
      if (!Array.isArray(pages) || pages.length === 0) throw new Error(`${fileName}: JournalEntry documents need pages.`);
      if (pages.some((page) => page?.type !== "text")) throw new Error(`${fileName}: JournalEntry pages must be text pages.`);
      if (pages.some((page) => !FOUNDRY_ID_PATTERN.test(page?._id ?? ""))) throw new Error(`${fileName}: JournalEntry pages need valid Foundry page IDs.`);
      const content = pages.map((page) => page.text?.content ?? "").join("");
      if (content.trim().length === 0) throw new Error(`${fileName}: JournalEntry text content is required.`);
      if (providerFlags.kind !== "journal") throw new Error(`${fileName}: journal records must flag kind journal.`);
    }
    if (type === "RollTable") {
      if (providerFlags.kind !== "table") throw new Error(`${fileName}: table records must flag kind table.`);
      validateTableRecord(fileName, source);
    }

    documentIds.add(source._id);
    documentNames.add(source.name);
    const document = structuredClone(source);
    delete document._key;
    documents.push({ slug, document });
    catalogEntries.push({
      id: slug,
      kind: forcedKind ?? String(source.type ?? type),
      metadata: { documentId: source._id },
      title: source.name,
      uuid: `Compendium.${moduleId}.${packId}.${documentClass}.${source._id}`,
      version: contentVersion,
    });
  }

  compiledPacks.push({ pack, packId, type, documents, catalogEntries });
}

function validateTableRecord(fileName, source) {
  if (!Array.isArray(source.results) || source.results.length < 2) throw new Error(`${fileName}: RollTable needs at least two results.`);
  const weights = [];
  let position = 1;
  for (const result of source.results) {
    if (!result || typeof result !== "object") throw new Error(`${fileName}: malformed table result.`);
    if (result.type !== "text") throw new Error(`${fileName}: table results must be text results.`);
    if (typeof result.description !== "string" || result.description.length === 0) throw new Error(`${fileName}: table results carry their text in description.`);
    if (JSON.stringify(result.range) !== JSON.stringify([position, position + (result.weight ?? 1) - 1])) {
      throw new Error(`${fileName}: table result ranges must advance contiguously.`);
    }
    weights.push(result.weight ?? 1);
    position += result.weight ?? 1;
  }
  const faces = weights.reduce((total, weight) => total + weight, 0);
  if (source.formula !== `1d${faces}`) throw new Error(`${fileName}: RollTable formula must be 1d${faces}.`);
  if (source.replacement !== true || source.displayRoll !== true) {
    throw new Error(`${fileName}: RollTable should draw with replacement and display the roll.`);
  }
}

async function persistSourceStamps() {
  let restamped = 0;
  for (const { packId, documents } of compiledPacks) {
    for (const { slug, document } of documents) {
      const filePath = path.join(SOURCE_ROOT, packId, `${slug}.json`);
      const original = JSON.parse(await readFile(filePath, "utf8"));
      const provider = original.flags[moduleId];
      let mutated = false;
      if (provider.contentVersion !== contentVersion) {
        provider.contentVersion = contentVersion;
        mutated = true;
      }
      const expectedHash = canonicalContentHash(original);
      if (provider.contentHash !== expectedHash) {
        provider.contentHash = expectedHash;
        mutated = true;
      }
      if (mutated) {
        restamped += 1;
        await writeFile(filePath, stableJson(original), "utf8");
      }
    }
  }
  return restamped;
}

function expectedPackBytes(packId) {
  const entry = compiledPacks.find((compiled) => compiled.packId === packId);
  return `${entry.documents
    .slice()
    .sort((left, right) => left.document._id.localeCompare(right.document._id))
    .map(({ document }) => canonicalLine(document))
    .join("\n")}\n`;
}

function expectedCatalog() {
  const packs = compiledPacks.map(({ pack, packId, documents, catalogEntries }) => ({
    compendia: [`${moduleId}.${packId}`],
    contentKinds: [...new Set(catalogEntries.map((entry) => entry.kind))],
    description: `Canonical ${pack.name} content of ${moduleId}.`,
    entries: catalogEntries.slice().sort((left, right) => left.id.localeCompare(right.id)),
    id: packId,
    title: pack.label,
  }));
  return {
    documentCount: documents793(),
    packs,
    providerId: moduleId,
    schemaVersion: 1,
    version: contentVersion,
  };
}

function documents793() {
  return compiledPacks.reduce((total, { documents }) => total + documents.length, 0);
}

if (WRITE) {
  const restamped = await persistSourceStamps();
  for (const { packId } of compiledPacks) {
    await writeFile(path.join(PACK_ROOT, `${packId}-v2.db`), expectedPackBytes(packId), "utf8");
  }
  const total = documents793();
  catalog.documentCount = total;
  catalog.packs = expectedCatalog().packs;
  const rebuiltCatalog = { documentCount: total, packs: expectedCatalog().packs, providerId: moduleId, schemaVersion: 1, version: contentVersion };
  await writeFile(path.join(PACK_ROOT, "catalog.json"), stableJson(rebuiltCatalog), "utf8");
  console.log(`Rebuilt ${compiledPacks.length} packs with ${total} documents for ${moduleId}; restamped ${restamped} source files.`);
} else {
  if (catalog.documentCount !== documents793()) throw new Error(`Catalog document count ${catalog.documentCount} differs from the sources.`);
  const expected = sortPlain(expectedCatalog());
  if (JSON.stringify(sortPlain(catalog)) !== JSON.stringify(expected)) {
    throw new Error("packs/catalog.json drifted from the source records.");
  }
  for (const { packId } of compiledPacks) {
    const actual = await readFile(path.join(PACK_ROOT, `${packId}-v2.db`), "utf8");
    if (actual !== expectedPackBytes(packId)) throw new Error(`packs/${packId}-v2.db drifted from packs/_source/${packId}/.`);
  }
  console.log(`Pack sources verified: ${compiledPacks.length} packs, ${documents793()} documents, content version ${contentVersion}.`);
}
