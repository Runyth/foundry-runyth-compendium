# Runyth Compendium

Runyth Compendium — system-agnostic custom items, features and world elements for any Foundry world, delivered as compendium packs through a thin wrapper module.

Install the module through the Foundry manifest URL below and every pack installs with it. The module ships content only: no scripts, no styles, no settings surface. The repository tooling builds the packs deterministically from source records and keeps every release reproducible.

## Packs

| Pack | Documents | What it carries |
| --- | ---: | --- |
| `armory` | 10 | Custom magic items (Porchlight Lantern, Coppermoor Sextant, Saltmarket Scale, …) |
| `features` | 8 | Custom feats and abilities for any system that imports general features |
| `world-elements` | 4 | Journal entries: usage guide, the Saltmarket Exchange, the Porchlight Compact, licences |
| `tables` | 2 | d20 roll tables: Saltmarket Curiosities and Porchlight Nights |

The pack IDs (`runyth-compendium.armory` and siblings) and document UUIDs are permanent compatibility contracts, per the Runyth repository standard.

## System-agnostic core, system-specific companions

The packs are deliberately system-agnostic: records carry no `system` block at all, so they install and open in any world. Importing an Armory item gives your system a clean document it can fill with its own mechanics; world elements and tables work everywhere as-is.

Enriching records with real system mechanics is the job of a companion on the established Runyth strategy — the same shape as the system-neutral Runyth Tables of Sustenance and its D&D 5e 2024 companion. A future `runyth-compendium-dnd5e-2024` companion will ship its own tested packs and require this module; the core stays neutral and does not require any system or companion.

## Identity

| Identity | Value |
| --- | --- |
| Display title | `Runyth Compendium` |
| Module ID | `runyth-compendium` |
| Repository | `Runyth/foundry-runyth-compendium` |
| Content version | `1.0.0` |

## Installation

Install the module through the Foundry manifest URL:

```text
https://github.com/Runyth/foundry-runyth-compendium/releases/latest/download/module.json
```

## Development

Records are authored as JSON under `packs/_source/<pack>/` and compiled by `npm run packs:rebuild` into deterministic NeDB packs with a canonical content hash stamped in every record's module flags. `npm run check` verifies formatting, manifest and archive sanity, the packs and catalog, the module tests, and the release artifacts.

This repository follows the Runyth Foundry module standard. Run `npm run check` before submitting changes. See `docs/REPOSITORY_STANDARD.md` for repository and compatibility rules.

## Releases

Each release provides the installable `-mod` archive, a complete `-src` source archive, a `-doc` documentation archive, SHA-256 checksums, and the release manifest. The tag, `module.json`, `package.json`, install archive, source archive, and release download URL all agree on the version.

## Content licence

Gameplay and homebrew content is `CC BY-SA 4.0`. State that licence in the README and on each content record the module ships — the pack compiler stamps `contentLicence: "CC BY-SA 4.0"` into every record's module flags, the source JSON under `packs/_source/` carries the same statement, and the **Licence & Credits** world element explains the pair to players. Do not copy official rules text into the Compendium; every record is original Runyth homebrew.

The licence fields are exclusive: the source licence is `AGPL-3.0-or-later`, and the content licence is `CC BY-SA 4.0`.

## Licence
Copyright © 2026  [Daniel Braniewski](https://brani.dev/)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
