# Changelog

## 1.0.0 — 2026-11-09

- Establish the system-agnostic Runyth Compendium: Armory (10 items), Features (8 feats), World Elements (4 journals) and Tables (2 roll tables) as deterministic NeDB packs compiled from JSON source records.
- Stamp the canonical content hash and the CC BY-SA 4.0 content licence into every record's module flags, with AGPL-3.0-or-later source code kept separate.
- Add the module-owned pack compiler that verifies IDs, authoring keys, agnosticism, ownership, licences and table shapes, and regenerates packs plus the pack catalog.
- Add compendium regression tests for record hygiene, catalog parity and publication hygiene.
- Align the release contract with the Runyth archive standard: `-mod`, `-src` and `-doc` archives, SHA-256 checksums, and a machine-readable build report per release.
