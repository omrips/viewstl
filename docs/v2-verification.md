# ViewSTL v2 verification

This file records dated checks. Older sections describe the alpha at the time
of each check; release-candidate results are recorded separately below.

## rc.9 website/plugin separation — 2026-11-14

The four browser/CJS/classic distributions contain no website controller,
required page-control IDs or `mountViewstlApp` export. `ViewerSession` was tested
in a bare page with only two containers: lazy initialization, independent state,
malformed-file recovery, detached snapshots, transforms, duplication, arrangement,
animation metadata, manipulation binding, VSB import/export, failed scene append,
cancellation and resource disposal all passed (17 checks).

144 plugin unit tests, strict browser/Node TypeScript checks and 37 legacy-file
hashes passed. Seven UI input tests moved with their source to the website and
passed there. Native WebGL2, workers/CAD assets and Node analysis are retained.

The candidate-packed website passed 54 shortcut, 24 lifecycle, 42 save/PNG,
26 scene-save, 25 scene-open, 39 persistent-print-panel, 25 animation, 25 model-tool,
15 URL-drop and 578 supporting-page/navigation checks in Windows Edge 157.
Ten production layout assertions passed in Windows Chrome 157, including
footer/resize behavior. Viewports, touch and reduced motion were emulated;
physical Android/iOS, Safari/Firefox and broad large-CAD stress were not tested.
URL fixtures intercepted the relay; local save/check tests recorded no uploads.

The compressed ESM plugin entry is 44,926 bytes, and the separate minified site
controller is 14,591 bytes. Production's measured initial viewer/page assets
total 77,933 gzip bytes (excluding third-party ads/analytics and lazy assets).
These are artifact sizes, not download-time or memory benchmarks.

Evidence: plugin `test-results/separation-tests.txt` and the sibling website's
`results/separate-site-ui-20261114/final/`. Website sources and tests are not part
of the plugin package. Published rc.8/legacy builds retain their original APIs;
rc.9 documents the migration for consumers of the removed app helper.

## rc.8 selection-tool verification — 2026-11-14

Selection mode opens the compact tool box with Move active. The website passed
54 desktop-shortcut checks, including retargeting, Move/Rotate/Depth drags,
unchanged camera/unselected models, empty-space drags, fresh-session defaults,
Select-off/Done/Escape, cancellation during dragging and narrow-screen exit.
Existing animation (25), model tools (25) and app lifecycle (24) checks passed.
Tests used headless Windows Edge 157.0.4341.46; narrow/touch cases are emulation.
No physical mobile, Safari or Firefox validation is claimed for this change.

147 unit tests, strict browser/Node type checks and all 37 legacy hashes pass.
Evidence: website `results/selection-tools-20261114/`, plugin
`test-results/rc8-tests.txt` and the staged rc.8 package verification artifacts.

## rc.7 release candidate verification — 2026-11-14

The desktop app shortcuts and VSB binary MIME fix pass 147 unit tests, strict
browser/Node type checks and the 37-file legacy integrity guard. Both staged
package names pass browser and Node ESM/CommonJS import checks, package-content
checks and the required first-line version/banner checks.

The website candidate passed 43 shortcut checks in headless Windows Edge
157.0.4341.46: Open/Save, all seven camera presets, unchanged model transforms,
single-click selection without camera movement, drag rejection, keyboard
toggle/Escape, resize exit, persistent print results, disabled empty-scene
actions, and desktop/narrow/touch-only layouts. Another 26 scene-save and 25
scene-open checks passed. Scene URL fixtures use mocked relay responses.
Screens/touch are emulation; no physical Android, Safari or Firefox validation
is claimed. The previously requested banner is included in rc.7.

Evidence: website `results/desktop-shortcuts-20261114/` and plugin
`test-results/desktop-shortcuts-20261114/` / `test-results/vsb-mime-20261114/`.
The VSB section below records the earlier local checkpoint, before rc.7 staging.

## VSB download MIME fix — 2026-11-14 (local, unpublished)

The owner reported Android saving scenes as `name.vsb.zip`. Both the scene
worker used by `export_scene` / `download_scene` and the compatibility
`get_vsb_blob` / `download_vsb` path now return `application/octet-stream`
instead of `application/zip`. The `.vsb` filename and ZIP container bytes are
unchanged; existing VSB files remain compatible. Actual OBJ ZIP exports still
use their ZIP MIME type.

All 147 unit tests pass and the 37-file legacy integrity guard passes. A real
worker/download check in headless Windows Edge 157.0.4341.46 verified binary
MIME for both VSB APIs, reopened both two-model scenes with positions preserved,
and downloaded `android-scene.vsb` without console errors. Evidence is in
`test-results/vsb-mime-20261114/` and `test-results/vsb-mime-tests-20261114.log`.
Android download behavior still requires a physical-device retest. A file
manager that inspects the bytes may continue recognizing the ZIP container.

The build is updated locally, including the previously approved author banner.
The package version remains rc.6 for this unpublished working tree; do not
overwrite the existing registry artifact. Production/preview still use the
published rc.6 package and have not received this fix. A new plugin version
and website deployment are needed to ship it.

## npm names and installation — 2026-11-07

Published `viewstl@2.0.0-rc.5` and `@omrips/viewstl@2.0.0-rc.5` with `latest`
pointing to rc.5. The existing scoped `next` tag was also advanced to rc.5.
Both READMEs document `npm install viewstl` and retain the scoped alternative.
All existing scoped versions remain available.

All 136 unit tests, strict browser/Node type checks and 37 legacy integrity
checks pass again. Both packed distributions pass Node ESM/CommonJS type checks
and runtime checks for browser exports, worker/CAD assets and STL/OBJ/3MF/STEP/IGES
analysis. Fresh public-registry installs without a version suffix pass those
runtime checks for both package names. Public tarball bytes and SHA-512 integrity
match the tested local archives; each package contains 40 files.

All 31 files under `build/` match the previously tested GitHub rc.5 distribution
byte for byte. No renderer changes were made and browser/device tests were not
rerun for this packaging update. The GitHub browser evidence below still applies
to those exact runtime bytes. Evidence: local `test-results/npm-stage.json` and
its referenced staging directory. See [maintainer workflow](npm-releases.md).

## GitHub root-layout release 2.0.0-rc.5 — 2026-11-07

The release worktree places the v2 sources/distribution in `src/` and `build/`.
The complete pre-v2 GitHub tree is archived under `legacy/v1/`; its 23 original
Git blobs and the 14-file local v1.14 snapshot pass SHA-256/size verification.
Historical sections below retain the paths and versions used at the time.

All **136 unit tests** pass, along with strict browser and Node TypeScript
consumers. Actual desktop Chrome 156, without device emulation, passes **46
browser checks**: 15 compatibility, 11 animation, 11 scene and 9 export checks.
These exercise the relocated classic/ESM entries, module workers, legacy mesh
bridge, STL/OBJ/3MF/STEP/IGES export/reimport, scene playback, cancellation,
context restoration and a responsive million-triangle STL export.

The packed `@omrips/viewstl@2.0.0-rc.5` tarball installs into a clean consumer
project. Browser ESM/CommonJS exports, version reporting, worker/CAD asset paths,
and server analysis of STL, OBJ, 3MF, STEP and IGES pass. Node analysis also
passes through the CommonJS entry. Archive contents exclude development fixtures,
legacy runtime copies and site/server files; license notices and lazy assets are included.

The layout update also corrects old harness references to the legacy parser and
worker directory. The compatibility animation assertion now waits for the public
completion callback and checks the public completed state, rather than assuming
the old private animation representation or a fixed wall-clock delay.

Evidence is retained locally in the original plugin checkout under
`test-results/github-v2-20261107/`. Physical mobile, Safari and Firefox validation
remain pending. This release does not update the preview website or npm registry.

## Live animation save/open verification — 2026-11-02

Verified the existing `20261102-f04f34e66b7c` release through the actual Save and
Open controls on `https://preview.viewstl.com/`, in desktop in-app Chromium.
No runtime changes or redeployment were needed. Two binary STL fixtures have
offset geometry centers: one runs reverse X rotation at 3 seconds per turn and
is paused; the other runs forward Z rotation at 7 seconds per turn.

Both VSB and VSJ were downloaded, the page was freshly reloaded, and the downloaded
files were opened and saved again. **40 checks pass** against the resulting files
and visible controls: two models, camera, position/scale/appearance, animation
definition, pivot/origin, pause state, exact paused time and pose, advancing running
time and a pose consistent with that time. VSB mesh coordinates match both their
original files and the re-saved archive. VSJ file references remain intact. The
paused model's elapsed time stayed exactly `7400.434000000001` ms in both formats;
the running model continued from each saved time instead of restarting.

A second pair of files was saved with both models paused. PNGs downloaded before
saving and after independently reopening each format are **byte-for-byte equal**.
VSB opens alone; VSJ was opened together with its two referenced STL files. Paused
models expose Resume with the restored axis, duration and direction. There were
no console errors on the final restored page. This is desktop-browser evidence,
not physical mobile or other-browser coverage.

The website workspace retains actual downloads, UI-state records, PNGs and
`verification.json` in `results/animation-roundtrip-20261102/`. Recheck those
artifacts with `node site/qa/verify-animation-downloads.mjs --images`; regenerate
the offset STL fixtures with `node site/qa/make-animation-fixtures.mjs`.

## Preview-site animation integration — 2026-11-02

Deployed to preview as `20261102-f04f34e66b7c`. The optional animation app binding
is bundled inside viewstl.js; the site's initializer is unchanged. The site adds
static controls under Models → Animation: axis, seconds per turn, direction and
Play/Pause/Resume/Stop. Off-center models spin about their center without moving
their visible pose. Editing uses current transforms, and adding/selecting files
preserves other models' animation. Print checks pause their targets and offer
explicit Resume while keeping the results panel open. Reduced-motion preference
pauses restored playback. Stopped animations also retain an equivalent static
VSJ pose with the original referenced mesh.

All **136 unit tests**, both strict type checks and the legacy guard pass.
Actual desktop Chromium 156 passes **25 new integration checks** and **96 existing
site checks**. New coverage includes invalid speed, concurrent models, live-pose
manual editing, drag entry, print pause/resume, VSB phase/pause restoration,
stopped off-center VSJ reopening with an identical PNG, callback composition,
clear/dispose/remount and simulated reduced motion. Keyboard Enter playback was
also exercised. 320px and 390px viewport checks show no horizontal overflow and
44px-high playback buttons; these are emulated widths, not physical touch tests.

All 29 public HTTPS files match the local SHA-256 manifest. Live browser smoke
checks cover loading, keyboard playback and print-check interaction. Nginx, relay
and Certbot remain active; configuration/service/binary hashes match the previous
release and SELinux remains enforcing. Initial gzip total is 57,897 bytes; the
viewer entry is 42,150 bytes. No new million-triangle or total-memory benchmark
was performed for the app controls; the earlier plugin measurement remains below.
Physical mobile, Safari/Firefox and actual hidden-tab behavior remain unverified.

Evidence: the site workspace's `results/animation-integration/` and
`results/deploy-20261102-f04f34e66b7c/`. Reproduce the browser checks through the
local-only `site/qa/animation.html` and `site/qa/index.html` pages. The QA harness
is excluded from deployment. npm is unchanged (`2.0.0-rc.4`); no GitHub push.

## Model animation — unreleased development update, 2026-11-02

The local plugin now has validated legacy delta/exact playback, per-model
pause/resume/state queries and transition/completion callbacks. Animation uses
elapsed frame time, retires finished tracks independently, stops on manual
transform edits and suspends on document hiding or context loss. VSJ and both
VSB APIs preserve animation phase, pause state, units and rotation pivot; animated
VSB meshes retain scale in metadata to avoid applying it twice on reopening.
The native WebGL2 renderer and existing worker architecture remain in use.

- All **132 Node tests pass** on Node.js 24.19.0, Windows. Nine new tests cover
  mixed durations, frame cadence, pause/resume/suspension, manual changes,
  replacement and copied state, scale/statistics invalidation, invalid numeric
  inputs and overflow, scene validation, VSJ/VSB restoration and export snapshots.
- Browser and server-only strict TypeScript checks pass. The legacy guard passes
  for tracked legacy files and all 14 archived files.
- **11 animation browser checks pass** in actual desktop Chromium 156 on Windows,
  using workers and WebGL2. These cover constructor playback, concurrent models,
  idle behavior, pause/resume/stop, modern and legacy scene restoration, group
  starts, bad-scene rollback, print-check staleness, mesh/PNG snapshots, forced
  context loss/restoration and resource cleanup. Context loss is deliberately
  triggered with `WEBGL_lose_context`, not a hardware failure.
- Existing browser compatibility (**15**) and scene/rendering (**11**) checks
  also pass: **37 passing browser checks** in total.
- A generated **1,000,000-triangle** model animated over 120 measured frame
  intervals: median **16.7 ms**, p95 **16.8 ms**, maximum **16.9 ms**. Geometry
  objects and GPU resources retained identity, with two GPU buffers and
  72,375,000 bytes of resident geometry typed arrays. These are frame intervals
  on one desktop, not GPU timings, allocation profiling or total process memory.
- The interactive example at `examples/v2/animation.html` runs locally and exposes
  Play, Pause, Resume, Stop and Reset. No models or external assets are fetched.

Actual hidden-tab behavior remains unverified: automation tab changes in the
in-app browser and Chrome did not produce a document `visibilitychange` event.
The suspension/resumption code is covered by unit tests and the real WebGL
context-loss check. Firefox, Safari, physical phones/tablets, touch, reduced-motion
site integration and a total-memory profile have not been tested in this update.

Reproduce with `pnpm build`, `pnpm test`, `pnpm check:types`,
`pnpm check:node-types`, `pnpm check:legacy`, then `pnpm start`. Open
`tests/v2/animation-browser.html`, `tests/v2/browser.html` and
`tests/v2/scene-browser.html` and run their checks. The million-triangle and
background-tab checks have separate buttons on the animation page.

Evidence is retained locally in ignored `test-results/animation-*` files. The
package version is still `2.0.0-rc.4`; this development update has **not** been
published to npm or deployed. The proposed site work is described in
[the preview integration plan](v2-animation-site-plan.md).

## Runnable server example 2.0.0-rc.4 — 2026-10-20

The npm README now contains a clearly labeled server-only example, including
installation, the `analyze.mjs` filename, a three-line script that prints JSON,
and the command to run it. This is a documentation update.

The exact example was extracted from the packed README and run with a binary
STL using the installed package on Node.js 24.19.0 on Windows. The resulting
JSON contains the expected dimensions, surface area, validated volume and mesh
checks. All 40 packaged files match the local release sources by SHA-256.
All 31 existing browser/Node runtime, declaration and CAD assets match the
public `2.0.0-rc.3` package apart from embedded version strings. The legacy
guard passes for tracked files and all 14 archived files. No runtime logic was
changed; the broader API verification below still describes the implementation.

Evidence is retained locally in `test-results/npm-2.0.0-rc.4/` (ignored by Git).

## Node.js model analysis 2.0.0-rc.3 — 2026-10-20

The new `@omrips/viewstl/node` export provides `analyzeFile`, `analyzeBuffer`
and `createAnalyzer`. It reuses the browser's parsers and mesh checks in Node
worker threads, loading CAD JavaScript/WASM from the installed package.

- All 123 tests pass on Node.js 24.19.0 on Windows. New tests cover real workers,
  all five model formats, physical and unknown units, validated/invalid volume,
  malformed input and recovery, buffer offsets and ownership, file/archive/
  triangle/memory admission limits, bounded queues, cancellation, disposal,
  whole-job and partial-check deadlines, and progress callback failures.
- A clean consumer installation of the packed tarball passes on actual Node.js
  20.20.2 and 24.19.0 on Windows. ESM and CommonJS each analyze STL, OBJ, 3MF,
  STEP and IGES fixtures through the public export, including local CAD WASM.
  Buffer input, unknown units and recovery after malformed input also pass.
- Strict TypeScript consumers pass for both module systems using Node types
  without the DOM library, including against the installed package. Existing
  browser TypeScript checks also pass.
- The package contains 40 files and no runtime dependencies. Installed files
  match their release sources by SHA-256. The allowlist excludes test fixtures,
  local test servers, credentials and node_modules.
- All 26 existing browser runtime/declaration/CAD assets match the public
  `2.0.0-rc.2` package apart from embedded version strings. Browser behavior was
  not changed; no new browser or physical-device test coverage is claimed.
- The legacy guard passes for tracked legacy files and all 14 archived files.

Linux/macOS execution, additional Node versions and large production workloads
have not been exercised in this release check. Memory budgets are estimates,
not a hard process RSS cap. STEP/IGES results describe the tessellated mesh,
not exact CAD solids. Optional FDM estimates are not a printability guarantee.

Reproduction scripts, packed/public-install verification, fixtures and terminal
evidence are retained locally in `test-results/npm-2.0.0-rc.3/` (ignored by Git).

## Quick-start documentation update 2.0.0-rc.2 — 2026-10-20

The README and usage guide now begin with the minimum installation step and
a three-line HTML example. The example was extracted unchanged from the README,
served with the complete distribution directory and a binary STL, and verified
in the desktop Codex Chromium browser: the model rendered, the worker and model
requests succeeded, and keyboard rotation responded without console errors.

All 112 unit tests and the legacy preservation check passed. Every runtime asset
was compared with the installed public `2.0.0-rc.1` package; only the embedded
version string changed. This update does not add browser/device coverage beyond
the release-candidate verification below. Evidence is in the ignored local
`test-results/npm-2.0.0-rc.2/` folder.

## npm release candidate 2.0.0-rc.1 — 2026-10-19

Prepared the first public npm package as `@omrips/viewstl`, with the release
candidate on the `next` tag. The package version and `StlViewer.version` agree.
The GitHub legacy paths and all archived legacy files remain unchanged.

Validation against the packed tarball installed into a clean consumer:

- 112 Node tests pass, with strict TypeScript source-consumer checks.
- ESM imports and CommonJS requires work without a browser DOM. Both installed
  package TypeScript entry points pass strict NodeNext checks.
- All 35 installed files match the release source by SHA-256. The allowlist
  includes the viewer, module worker, lazy chunks, CAD glue/WASM, declarations,
  documentation and license/source notices. No credentials, test data, local
  server scripts, node_modules or legacy runtime files are packaged.
- Production builds succeed with Vite 8.3.4 and Webpack 5.112.0. Both follow the
  documented complete-static-directory copy and explicit `worker_url` setup.
- 11 browser checks pass in each of four consumers: Vite, Webpack, direct ESM
  and classic script (44 total). These use the installed distribution and real
  WebGL 2/module workers for local binary STL, STL/OBJ/3MF/STEP/IGES exports and
  reimports, print checks, PNG export, VSB save/load and VSJ export.
- Browser: desktop Codex in-app Chromium 155.0.0.0 on Windows, without device
  emulation. The local pages use a same-origin CSP without JavaScript eval;
  WebAssembly compilation is allowed. Parser/CAD assets are self-hosted.
- The legacy guard verifies unchanged tracked legacy files and all 14 archived
  snapshot hashes.

Reproduction scripts, build fixtures, tarball inventory, terminal results,
browser output and screenshots are retained locally in the ignored
`test-results/npm-2.0.0-rc.1/` folder. Firefox, Safari, physical touch/mobile
devices and broader real-world large-CAD workloads remain unverified; this
release is a candidate, not a claim that those checks have passed. The optional
bundler `worker_factory` variant was not exercised by this release check.

## URL drops in the optional app controller — 2026-10-02

`mountViewstlApp` routes dropped HTTP/HTTPS links through its configured relay and
existing URL import queue. Six new unit cases bring the plugin suite to 93 passing
tests; strict types and all 14 legacy integrity checks pass. The site's full
96-assertion browser harness and 15 app lifecycle checks pass with this build.

Desktop headless Edge 154.0.4258.48 passes 15 local and 16 live URL-drop checks:
URI/plain-text/Firefox payloads, signed query preservation, deduplication, local
file precedence, untouched input behavior, unsupported schemes, failure recovery,
cancellation and an actual anchor drag. Firefox data is emulated; Firefox/Safari
and physical devices were not tested. Live preview also fetched and parsed a
real public STEP URL through Go. Other deterministic URL-drop response fixtures
are explicitly mocked in the browser runner. These changes and the preceding
export API build ship on preview in release `20261002-8f91150b7782`; export controls
are still not wired to the site. The legacy site was not changed.

## Plugin mesh exports — 2026-10-02

The local v2 build adds `export_models` and `download_models` for binary STL,
OBJ/MTL, 3MF, STEP/STP and IGES/IGS. These are plugin-only changes; the website
and deployed preview assets have not been synchronized or changed for this work.
All writers are JavaScript worker modules; CAD export does not use the Go relay
or download a new CAD engine. The native WebGL2 renderer and legacy APIs remain.

Validation:

- 87 Node tests pass, including 14 export cases. The strict TypeScript consumer
  check passes. All 14 archived legacy files verify unchanged.
- Open CASCADE independently reads generated STEP and IGES: open triangle
  surfaces, multiple models, nonuniform scale, rotation, translation, millimeter
  and inch units. Triangle counts, bounds and area match the expected mesh.
  Checking area exposed IGES numeric tokens crossing padded parameter records;
  writers now wrap at parameter boundaries and the regression covers this.
- Official 3MF Core/Materials XSD appendix validation passes with lxml. The
  validation helper uses a stricter one-million occurrence cap because libxml2
  2.11 rejects the published `2147483647` value, and trims the leading space in
  the Materials appendix's `type=" ST_Numbers"`. No geometry/schema rules are
  relaxed. ZIP/XML tests also verify object separation, shared vertices, units,
  per-vertex color gradients, safe names and material references.
- Headless desktop Edge **154.0.4258.48** passes all 9 export browser scenarios
  and all 15 existing browser compatibility scenarios. The export page uses a
  same-origin CSP without JavaScript eval. Tests cover real workers, all-format
  reimport, preserved live buffers, selected export, OBJ ZIP, a real browser
  download, running/queued cancellation, callback exceptions, scene cleanup,
  memory rejection and subsequent recovery. No unexpected page/WebGL errors.
- Export/reimport requests were same-origin GETs; the actual download used a
  local Blob. No file upload or external endpoint request occurred. Edge's
  internal `edge://` downloads-panel resources are excluded from web traffic.
- A **1,000,000-triangle binary STL** produced **50,000,084 bytes** in **1,277 ms**
  with **75 animation frames** during export. This is one synthetic local desktop
  observation, not a performance guarantee or a measured process-memory peak.

Evidence: `test-results/exports/browser.json`, `browser.png`, `compatibility.txt`,
`assembly-mm.step`, `assembly-inch.step`, `assembly-mm.iges`, `assembly-inch.iges`
and `colored-scene.3mf`. These generated files are ignored by Git. Reproduce the
browser checks with a local plugin server and `scripts/check-export-browser.mjs`
(Playwright module supplied by `VIEWSTL_PLAYWRIGHT`, URL by `VIEWSTL_QA_URL`).

The optional `scripts/check-export-3mf-schema.py` reads the following downloaded
source files from `test-results/exports` and validates the generated 3MF fixture:

- `3mf-core-spec.txt`: https://raw.githubusercontent.com/3MFConsortium/spec_core/master/3MF%20Core%20Specification.md
- `3mf-materials-spec.txt`: https://raw.githubusercontent.com/3MFConsortium/spec_materials/master/3MF%20Materials%20Extension.md
- `xml.xsd`: https://www.w3.org/2001/xml.xsd

Limits: STEP/IGES contain planar mesh surfaces, not recovered analytic CAD solids
or feature history. No F3D is implemented. 3MF performs edge/winding/volume checks,
not full solid repair or self-intersection testing. Physical phones/tablets,
Safari/Firefox, commercial CAD applications and large STEP/IGES export workloads
have not been validated in this change. Export options and omissions are listed
in [usage](v2-usage.md#local-mesh-export).

## STEP/IGES addition — 2026-10-01

The local build adds STEP/STP and IGES/IGS with lazy, self-hosted WASM in
disposable workers. The 54 plugin tests and TypeScript checks pass. Six CAD
tests also pass under Node's `--disallow-code-generation-from-strings` flag:
format aliases, unit conversion, assembly geometry/colors, malformed input,
recovery, index validation, input/output budgets and rejection of an allocation
beyond a 32 MiB configured WASM heap. The 14 archived legacy files verify unchanged.

The website's 16 unit tests and its complete browser harness pass in local
headless Edge 154.0.4258.37. Additional browser checks verify no CAD downloads
for the empty page or STL, cancellation during the reader download, subsequent
CAD recovery and GET-only same-origin asset requests without file uploads.
The browser harness exercises all four aliases, mm dimensions, colors, malformed
CAD recovery and multiple CAD files, alongside existing STL/OBJ/3MF and view tests.

These are desktop automated checks, with a 390px emulated viewport for layout.
Physical mobile devices, Safari/Firefox and large real-world CAD assemblies have
not been validated. No new browser-memory or large-CAD performance claim is made.
After explicit deployment authorization, the synchronized site and viewer were
deployed as preview release `20261001-f40c6b922ea5`. All 22 public file hashes
matched. Live headless Edge verified all four CAD aliases, correct mm dimensions,
assembly positions/colors, malformed-file recovery and existing STL/OBJ/3MF
loading. Observed network requests were same-origin GETs with no uploaded file
data. The WASM response used `application/wasm` and gzip; no CSP/page errors were
reported. Deployment evidence is in the website workspace's
`results/deploy-20261001-f40c6b922ea5/`. DNS and the legacy site were unchanged.

Checked on 2026-09-30, version `2.0.0-alpha.1`, on Windows in the
Codex in-app Chromium browser. These results describe this development
release, not a claim of complete compatibility with every legacy integration.

## Completed checks

Update 2026-10-01, additional views: the Node suite now has 43 passing cases.
All 15 existing browser compatibility checks passed, plus 11 new appearance
checks in `tests/v2/appearance-browser.html`. Those validate actual PNG pixels
for mesh lines, studio shading, X-ray transparency, feature edges, wireframe,
front/back orientation colors, half-model clipping and reversed clipping;
all section axes/endpoints; independent smooth shading; VSJ/VSB persistence;
graphics context restoration; and repeated switching/resource cleanup.
Node cases cover section-aware picking, edge angles, budget rejection, worker
failure and stale view completion. Strict consumer types and all 14 archived
legacy hashes passed. The site passed 31 browser checks and 2 policy checks.
Responsive controls were inspected at 320 × 740 and 390 × 844, with no
horizontal overflow; these are desktop viewport simulations, not real touch
hardware tests. Live preview loading, smooth/edge derivation, Studio and
section controls passed with no browser warnings/errors. The new appearance
tests use small fixtures; no additional large-model stress test was run.

Update 2026-10-01: chunked local binary STL parsing, optional memory-budget checks,
OBJ line iteration and GPU-allocation failure cleanup were added. The 36-test
Node suite passed, followed by the additional GPU fault-injection test (37 total
cases). TypeScript and legacy preservation checks passed. All 15 browser cases
below passed again; the separate preview site passed 22 browser and 2 policy
checks. A 300,758,484-byte binary STL with 6,015,168 triangles rendered locally
and on preview.viewstl.com, exceeding the old byte and triangle limits. Its
wireframe request was rejected by the configured memory budget before map
allocation. The file stayed on the client. This is one desktop test, not a
guarantee for every model/device; large OBJ/3MF and low-memory mobile stress
tests remain outstanding. Existing package-tarball checks below are from the
September verification; no new npm publication occurred.

| Check | Result |
| --- | --- |
| Node automated tests | 30 passed, 0 failed |
| Real browser integration checks | 15 passed, 0 failed; no unexpected callback errors |
| TypeScript strict consumer checks | ESM and CommonJS package declarations checked |
| Local npm tarball installation | ESM/CJS constructors, worker/browser exports and types resolve |
| Legacy preservation | Original tracked source/build/dependencies unchanged; 14 local snapshot hashes match |
| Responsive demo | Single-column layout at 390 × 844; no horizontal document overflow |
| Local file picker | Keyboard-accessible picker loads a real cube STL; dimensions 2 × 2 × 2, 12 triangles |
| Direct manipulation | Mouse drag visibly rotates the loaded model; grid keyboard control and wireframe/smooth selection checked |

Automated coverage includes ASCII/binary STL, three color conventions,
invalid/truncated/non-finite data, OBJ indices, bounds/area/volume,
nonuniform scaling, matrix/picking calculations, transfer detachment,
worker limits/cancellation/timeouts, ZIP integrity/expansion limits,
real saved VSB archives, 3MF transforms/colors/relationships and invalid
XML/component cycles.

Browser coverage exercises classic-script and module entry points, actual
module workers, callback order, IDs including zero, idle rendering,
appearance/transforms/units, picking, disabled controls, animation,
VSJ relative URLs, multiple models, VSB round trips, 3MF/OBJ loading,
PNG capture, legacy API comparisons, the optional real Three.js mesh
bridge, cancellation with ID reuse, clean/dispose, context restoration,
and a visible initialization failure when WebGL2 is unavailable.

The legacy comparison deliberately records one corrected bug: model
dimensions now change after scaling. The legacy plugin returned stale
dimensions while already reporting scaled area and volume.

## Performance observation

A generated **1,000,000-triangle binary STL (50.0 MB)** loaded through the
worker and reached the first rendered frames in **273 ms** in one desktop
run. WebGL reported no error. It used two tracked geometry buffers; after
`clean()`, there were **zero tracked GPU buffers and zero active workers**.

The input was an in-memory File generated before timing. This does not
measure network download, physical disk latency, peak memory, cold-browser
startup, or mobile performance. It is a reproducible smoke benchmark, not
a cross-device promise. Run it from `/tests/v2/browser.html`.

## Build sizes

Sizes measured with Node gzip defaults; servers must enable compression
to achieve compressed transfer sizes. Decimal kB below.

| Asset | Raw | Gzip |
| --- | ---: | ---: |
| Classic minified viewer | 43.3 kB | 14.9 kB |
| Module worker | 4.6 kB | 2.1 kB |
| Shared worker geometry chunk | 3.8 kB | 1.9 kB |
| Lazy archive/XML chunk | 47.2 kB | 16.4 kB |
| Readable ESM viewer, alternative to classic | 69.0 kB | 18.5 kB |

The classic viewer plus initial STL worker code totals 51.6 kB raw /
18.9 kB gzip. Archive/XML support loads only for archive operations.
The rendering/STL core includes no third-party runtime library.

## Reproduction and remaining validation

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm check:types
pnpm check:legacy
pnpm start
pnpm pack
```

The local tarball was installed into an isolated consumer directory with
scripts disabled, then its ESM import, CommonJS require, asset exports and
strict TypeScript consumers were checked. No npm package was published.
The package remains `private: true`; `@omrips/viewstl` is a provisional name.

Before a stable release or production replacement, test Firefox, Safari,
real touch/mobile hardware, high-DPI devices, representative large customer
models, peak memory, Vite/Webpack integration, and production-site callers.
The legacy site's direct Three.js internals need migration. The supported
3MF/OBJ subsets and transparency limits are described in [usage](v2-usage.md).

Raw local browser results and the test tarball are in the ignored
`test-results/` directory. No production files, DNS, server configuration,
GitHub branch or npm registry entry were changed by this implementation.

## Scene/grid verification — 2026-10-01

47 Node tests passed, including aggregate scene memory accounting, serialized
budgeted parsing, reservation cleanup on allocation/dispatch failures and
multi-model derived-work guards. Strict TypeScript and 14-file legacy checks passed.
The Chromium browser passed 15 compatibility, 11 appearance and 8 new scene cases.
The scene cases exercise original coordinates, tint/restore without GPU buffer
reallocation, grid coverage beyond model bounds after pan/zoom, opaque depth
occlusion, PNG background color, finite-grid compatibility, infinite-grid VSB
round trip, context restoration/cleanup, aggregate budget rejection/recovery and
cancellation of derived work on model removal. Real mobile GPUs, Safari and Firefox
remain untested for these additions. The preview site was updated separately;
legacy files and npm publishing remain unchanged.

## Editing frame and picking — 2026-10-01

48 Node tests, strict TypeScript checking and the 14-file legacy integrity check
passed. Chromium passed 15 compatibility, 11 appearance and 11 scene browser
cases. Additional scene coverage verifies editing-frame pixels, clean PNG exports,
frame-buffer reuse during transforms, selection switching and cleanup, recovery
after graphics-context loss, and nearest visible surface picking after transforms.
Real mobile GPU, Safari and Firefox coverage remains outstanding.

## Plugin-owned app controller — 2026-10-02

The website's application logic and four policy/transform helper modules now
compile into `viewstl.js`. The ESM, CommonJS and classic-script builds expose
`mountViewstlApp`; low-level `StlViewer` behavior is preserved. The suite now
contains 70 Node tests, including the 16 tests moved from the site. All pass,
along with strict TypeScript and the 14-file legacy integrity check.

Automated Edge 154.0.4258.48 passed the site's 96 browser assertions and 15
additional controller checks: lazy mounting, optional samples, duplicate-mount
rejection, public file loading, detached state, cancellation, disposal during
an active parser job, worker/canvas/listener cleanup, idempotent disposal,
refusing calls after disposal, late-read isolation during remounting, separate
embedded roots, radio groups and drop targets. CAD lazy loading, cancellation,
recovery and a 390px viewport were also rechecked. No new real-mobile, Safari
or Firefox coverage is claimed.

Preview release `20261002-79c817751172` passed all 18 asset hashes and live
HTTPS checks for STL, OBJ, 3MF and all four CAD aliases, malformed CAD recovery,
millimetre dimensions and assembly colors. Observed requests were same-origin
GETs without bodies; no CSP/page errors occurred. Evidence is in the sibling
website workspace under `results/plugin-app-refactor/` and
`results/deploy-20261002-79c817751172/`. No npm publication or GitHub push.

## Optional Save dialog — 2026-10-08

The app controller binds an optional complete save-* control group. All behavior
is packaged in viewstl.js and delegates to the existing download_models API;
low-level writers are unchanged. The host supplies explanatory markup/styles.

93 Node tests, strict types and all 14 legacy integrity hashes pass. Desktop
headless Edge 154.0.4258.62 passed 42 local and 42 deployed HTTPS Save checks:
actual STL/OBJ/3MF/STEP/IGES downloads and reimports, OBJ ZIP materials, translated
selected/all geometry, cancellation with actual stalled export workers, resource
cleanup, validation-error recovery, PNG regression and keyboard focus. 320/390px
layout and touch taps are emulation, not physical mobile tests. Twenty-four app
lifecycle checks cover export cancellation on clear/remove/dispose, independent
prefixed dialogs, optional-control omission and fail-fast incomplete groups.
Fifteen URL-drop regression checks also passed. No large-file performance claim
or Safari/Firefox coverage is added by these UI tests.

Preview release 20261008-580a812896b6 passed all 24 public file hashes. Observed
Save-test requests were same-origin GETs without uploads. Evidence and the
reproducible browser runners are in the sibling website workspace under
results/save-local, results/save-lifecycle, results/save-url-regression and
results/deploy-20261008-580a812896b6. No npm publication or GitHub push.

## Scene saving — 2026-10-08

Release 20261008-625337233d51 exposes VSB/VSJ whole-scene saving in the preview.
The five regular mesh formats save only the selected model, per the owner's
clarification. New export_scene/download_scene Promise APIs use get_vsj manifests
and the existing VSB/STL archive layout, with worker-based VSB encoding,
cancellation, progress, memory admission and output limits. Legacy scene getters
and download methods retain their contracts.

96 Node tests, strict types and all 14 legacy integrity hashes pass. Edge
154.0.4258.62 passed 26 scene checks locally and live, including downloaded VSB
round trips, VSJ round trips with explicitly supplied referenced fixture files,
scene settings, source names, cancellation, memory/output/count limits and
callback errors. 42 mesh/PNG/UI regression checks passed locally and live;
24 app lifecycle checks include cancellation of VSB workers on clear/remove/
dispose. Same-origin GET-only network evidence shows no export uploads. Narrow
and touch checks use emulation, not physical devices. Site scene reopening is
not implemented; round trips explicitly use the plugin's public scene loaders.
Evidence: sibling website results/scene-save-local, scene-save-mesh-regression,
scene-save-lifecycle and deploy-20261008-625337233d51. All 26 public hashes match.

## Scene opening — 2026-10-08

Preview release `20261008-2bc0de3fc7ab` opens VSB/VSJ through the plugin-owned file,
drop and URL flows. The new `import_scene` API validates manifests/archives, stages
models until success, remaps IDs, resolves local companions or relayed public URL
references, and restores scene settings and editable model placement. Errors and
cancellation preserve the existing scene. Legacy scene loaders are unchanged.

100 Node tests, strict types and all 14 legacy integrity hashes pass. Desktop
headless Edge 154.0.4258.62 passed 25 local and 27 live scene-opening checks,
including saved and legacy VSB files, local VSJ companions, editing/reset/re-saving,
missing files, malformed second-model rollback, cancellation during reading and
between models, recovery, URL routing and redirected VSJ base directories.
Live checks include real public VSJ/STL and VSB downloads through the deployed
Go relay; other remote fixtures are explicitly intercepted. Captured browser
traffic remains same-origin; local scene files and companions are not uploaded.
42 mesh/PNG/save, 24 lifecycle and 15 URL-drop regression checks pass locally.
Narrow layout is emulated; physical mobile hardware, Safari and Firefox remain
unverified. These fixture tests do not establish large-scene peak memory or speed.

The relay's 12 top-level Go tests pass, including both scene formats and final
redirect-base metadata without query secrets. All 27 public asset hashes match.
Nginx and relay service configuration hashes remain unchanged. Evidence is in the
sibling website's `results/scene-open-local`, `scene-open-save-regression`,
`scene-open-lifecycle`, `scene-open-url-regression` and
`deploy-20261008-2bc0de3fc7ab/live-open`. No npm publication or GitHub push.

## Print checks — 2026-10-17

112 Node tests, strict TypeScript and 14 legacy integrity hashes pass. The new
fixtures cover open meshes, duplicates, degeneracy, winding, vertex-only contacts,
disconnected solids, nested cavities, intersecting shells, coplanar overlap,
near-coplanar neighbors, small gaps, large translations, nonuniform scale, units,
FDM estimates, time limits, memory rejection and bounded diagnostic samples.
A 100,000-triangle curved fixture exposed a false coplanar-neighbor intersection;
the shared-edge predicate was corrected and the case retained as a regression.

Desktop headless Edge 155.0.4283.45 passes 27 print integration checks locally:
lazy loading, basic/detailed coverage, cache isolation, native highlights,
unchanged geometry/colors/PNG, stale reports, 390px layout, keyboard closing/focus,
selected/all scope, cancellation/recovery, callback errors, memory accounting,
removal/disposal, optional host controls and touch-emulated interaction. Additional
regressions pass: 42 save/PNG, 25 scene-opening and 24 app-lifecycle checks. No
physical mobile devices, Firefox or Safari were tested. Browser traffic captured
by the print runner is same-origin GET; no analysis uploads occur.

The browser's 100,000-triangle closed torus completed detailed checks in about
4.6 seconds with 279 animation frames and a maximum observed frame gap of 16.8 ms
in the initial recorded run. Results vary by run/device. The Node benchmark
`scripts/check-print-performance.mjs` measured about 0.6 s for 10,240 triangles
and 5.4 s for 100,000 triangles. Sampled JS heap reached about 164 MB on the larger
run; this is not a measurement of total/peak browser or GPU memory. Memory/time
limits deliberately reject or mark incomplete larger/ambiguous workloads.

Evidence: plugin `test-results/print-node.txt`, `print-performance.json`; sibling
website `results/print-local`, `print-save-regression`, `print-scene-regression`
and `print-lifecycle`. Reproduce browser checks with `site/qa/run-print-browser.mjs`.

Preview release `20261017-b0d9d98b838b` also passed all 27 print checks over
public HTTPS and all 29 public file hashes. Live evidence is in the sibling
website's `results/deploy-20261017-b0d9d98b838b/live-print`. The relay binary and
service/Nginx configuration hashes are unchanged; no npm publication or GitHub push.

The persistent-panel follow-up release `20261017-5b21747c4c8f` passes 39 browser
checks locally and over public HTTPS. Added coverage includes canvas focus,
appearance controls, other dialogs, repeat launch, narrow-screen toolbar access,
selection changes, loading/cancellation, adding/removing/clearing models and
explicit close from an empty scene. The panel remains open throughout unrelated
activity while stale reports and active jobs are handled safely. All 112 Node
tests, strict types and 14 legacy hashes pass again. Evidence: sibling website
`results/print-persistent/` and `results/deploy-20261017-5b21747c4c8f/`.

## 2026-11-07 — rc.6 model tools

146 unit tests pass, as do strict browser/Node TypeScript checks and the 37-file legacy hash guard. Actual Windows Chrome 156 runs against the site built from the candidate npm tarball: 25 new model-tools integration checks, 25 animation regressions and 96 existing site regressions pass. New coverage includes locked/nonuniform resize, invalid input recovery, mm/inch separation, copy animation isolation, source references, shared geometry/GPU cleanup, camera presets, bookmark validation/merge, static and animated VSB/VSJ round trips, reset baselines, explicit 3MF/CAD units, and malformed-scene rollback. Surface area and enclosed volume use known closed/open fixtures; source-unit corrections also survive untransformed mesh export.

Manual desktop checks cover size inputs, keyboard Apply and on-demand measurements. Narrow widths are viewport emulation, not physical phone tests. No physical touch device, Safari/Firefox or broad large-CAD stress testing is claimed. The bounded detailed mesh checker may return an unavailable/inconclusive volume; source coordinates without units remain assumed mm until corrected.

Website evidence is retained outside its public build in `Viewstl/results/rc6/`; local-only reproducible browser harnesses are `site/qa/model-tools.html`, `animation.html` and `index.html`. Generated assets and the whole npm distribution are packaged together.
