# Template synchronization

GitHub template repositories copy files into an unrelated new repository; they
do not create an upstream history relationship. Runyth therefore synchronizes
only declared managed files instead of merging template branches.

The monthly and manually triggered workflow:

1. checks out the module and current template;
2. reads the template's `.runyth/template-managed.json`;
3. replaces only managed platform files;
4. merges common package scripts without deleting module dependencies or
   custom scripts;
5. records the applied template version;
6. opens a pull request for normal review and CI.

Module-owned runtime code, data, manifest, README, changelog, license,
module-specific documentation, and feature tests are never template-sync
targets.

Run locally with:

```nu
npm run template:sync -- --source ../foundry-module-template
```
