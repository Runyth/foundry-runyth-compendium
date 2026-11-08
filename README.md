# Runyth Foundry Module Template

A production repository template for consistent Runyth Foundry VTT modules.
It supports new modules, content libraries, framework modules, companion
integrations, and conservative adoption of existing JavaScript modules.

## Create a module repository

1. Mark this repository as a GitHub template.
2. Create a new repository from it under the Runyth organization.
3. Clone the new repository.
4. Bootstrap its permanent identity:

```text
npm ci
npm run bootstrap -- \
  --id example-module \
  --title "Example Module" \
  --description "A concise module description." \
  --repository Runyth/example-module \
  --kind runtime
npm run check
```

The backslashes above are documentation formatting, not a Nushell command. A
Nushell-safe invocation is:

```nu
npm run bootstrap -- --id example-module --title "Example Module" --description "A concise module description." --repository Runyth/example-module --kind runtime
```

## Adopt an existing module

Create its new repository from this template, then run:

```nu
npm run adopt -- --source ../existing-module-source --apply
npm run check
```

The adoption tool preserves the existing `module.json`, module IDs, flags,
pack paths, runtime directories, documentation, and tests while refusing to
overwrite centrally managed Runyth tooling. Review the generated adoption
report before committing.

## Standard commands

| Command | Purpose |
| --- | --- |
| `npm run format` | Normalize JSON and text formatting |
| `npm test` | Run Node's built-in test runner |
| `npm run validate` | Validate manifest, paths, imports, localization, and repository policy |
| `npm run audit` | Audit deprecated, private, and unsafe Foundry patterns |
| `npm run build` | Create deterministic install and source ZIPs |
| `npm run verify:release` | Verify archive roots, versions, contents, and checksums |
| `npm run check` | Run the complete local quality gate |
| `npm run version:set -- 1.2.3` | Update all authoritative version locations |
| `npm run template:sync -- --source ../foundry-module-template` | Apply managed template updates locally |

## Release outputs

A build writes these assets under `dist/`:

```text
<module-id>-v<version>.zip
<module-id>-v<version>-source.zip
<module-id>-v<version>-SHA256SUMS.txt
module.json
build-report.json
```

The installable archive always contains one non-versioned module root. The
source archive contains one versioned source root and the complete repository,
excluding generated, secret, and cache paths.

## Design boundaries

- Existing runtime code can remain unchanged in passthrough mode.
- Optional compile steps are declared in `runyth.config.json`.
- Module-owned source and data are never overwritten by template sync.
- Public Foundry and complementary-module APIs are preferred over private
  imports or monkey patches.
- A module's IDs, flags, settings, pack names, UUIDs, hooks, and public APIs are
  compatibility contracts.

See `docs/REPOSITORY_STANDARD.md` and `docs/ADOPT_EXISTING_MODULE.md`.

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