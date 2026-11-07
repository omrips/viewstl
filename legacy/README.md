# Preserved legacy versions

On the v2 `main` branch, [`v1/`](v1/) contains the complete legacy GitHub
tree, including its original README, source, build, dependencies and license.
Its manifest records the original bytes and SHA-256 hashes of all 23 files.

The existing [`master` branch](https://github.com/omrips/viewstl/tree/master)
remains unchanged at the baseline below, preserving explicit master download
URLs. Existing tags are retained. New v2 source and output live at the root
under `src/` and `build/` on `main`; callers following the default branch
receive v2 and should review its migration notes.

## GitHub baseline

- Repository: https://github.com/omrips/viewstl
- Legacy branch: `master` (the default before v2)
- Baseline commit: `fbb7f5c3894862778c3a6c5d2630573e2496d01f`
- Preservation tag: `legacy-before-v2-2026-09-30`
- Latest legacy version tag: `v1.13`

The baseline commit includes changes after the `v1.13` tag. Do not treat the
release tag and the legacy branch as identical. The v2 release preserves
both that branch and the existing version tags.

## Local website snapshot

[`local-1.14-2026-09-30/`](local-1.14-2026-09-30/) contains 14 files copied
without modification from the legacy website checkout. Its unminified
`plugin/stl_viewer.js` identifies itself as version 1.14. The
[`manifest.json`](local-1.14-2026-09-30/manifest.json) records every copied
file's original relative path, byte length and SHA-256 digest.

This is an archival snapshot, not a newly built or certified v1.14 release.
The source and minified files have not been verified as corresponding
builds. `TrackballControls.js` was absent from that checkout's `plugin/`
directory and has not been substituted from another version. The GitHub
legacy build separately contains its own TrackballControls dependency.

The local source differs from GitHub in click coordinate handling, updating
disabled controls, its material choice and loading unminified worker files.
These differences must be assessed when defining compatibility tests; they
must not be lost through an automatic overwrite from GitHub.

The `general/` files are the original JSZip and JSZipUtils copies, preserved
for historical reference. They are not dependencies of the new STL core.
Keep the original license notices in all archived files.

This snapshot does not establish which exact files the production server
currently serves. No server or production files were changed to create it.
