// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { createHash } from "node:crypto";

const HASH_FIELDS = new Set(["_key", "contentHash"]);

function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (!value || typeof value !== "object") return value;
  const result = {};
  for (const key of Object.keys(value).sort()) {
    if (HASH_FIELDS.has(key)) continue;
    result[key] = scrub(value[key]);
  }
  return result;
}

export function canonicalContentPayload(document) {
  return JSON.stringify(scrub(document));
}

export function canonicalContentHash(document) {
  return createHash("sha256").update(canonicalContentPayload(document)).digest("hex");
}
