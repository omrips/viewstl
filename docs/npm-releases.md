# Publishing the two npm names

`viewstl` is the preferred install name. Maintain `@omrips/viewstl` with the same
version and complete distribution so existing imports and worker/asset paths
continue to work. The scoped package is not a wrapper dependency. Previous
published versions and GitHub archives are immutable.

1. Update version and documentation, build, and run the checks in `package.json`.
2. Run `pnpm stage:npm`. It creates a new ignored directory under `test-results/`
   with `viewstl/` and `scoped/` packages, using the package file allowlist. It
   removes source-only scripts/development dependencies and adds a short scoped
   compatibility note. It does not build, publish, authenticate or change tags.
3. Pack each printed directory using `npm pack <directory> --ignore-scripts
   --pack-destination <output>`. Inspect the file list and test both archives in
   clean consumers, including ESM/CommonJS, Node types, worker/CAD assets and
   supported model formats.
4. Publish each tested archive with `npm publish <archive> --access public
   --tag latest`. User browser authentication/2FA may be required for each
   publication. Keep existing prerelease tags such as scoped `next` current too.
5. Verify both public registry records, READMEs, tarball integrity and fresh
   `npm install viewstl` / `npm install @omrips/viewstl` consumers. Registry
   metadata may briefly lag after a successful publication; verify before
   reporting completion, without republishing the same immutable version.

The rc.5 npm runtime matches the original GitHub rc.5 build exactly. npm adds
the short package name and revised installation documentation; this does not
deploy either website or change the legacy branch/tags.
