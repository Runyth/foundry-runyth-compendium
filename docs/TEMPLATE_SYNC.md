# Template synchronization

GitHub template repositories copy files into an unrelated new repository; they
do not create an upstream history relationship. Runyth therefore synchronizes
only declared managed files instead of merging template branches.

The monthly and manually triggered workflow:

1. checks out the module and current template;
2. reads the template's `.runyth/template-managed.json`;
3. applies only the declared managed platform files;
4. merges common package scripts without deleting module dependencies or
   custom scripts;
5. records the applied template version;
6. commits the synchronized standard directly to the module's branch. Module
   repositories run with pull requests disabled, so the managed platform files
   are committed by the workflow bot instead of opened for review.

Module-owned runtime code, data, manifest, README, changelog, license,
module-specific documentation, and feature tests are never template-sync
targets. Module-owned helpers under a managed tree, such as `tools/module/`, are
preserved because trees are synchronized file by file.

## Managed path modes

- `replace`: overwrite a single file.
- `replace-tree`: replace an entire directory, deleting files that are no
  longer in the template.
- `sync-tree`: overwrite every file that exists in the template directory but
  leave module-owned files inside the same tree untouched.
- `merge-package`: merge shared `package.json` fields and scripts without
  removing module dependencies or custom scripts.

Run locally with:

```nu
npm run template:sync -- --source ../template-foundry-module
```
