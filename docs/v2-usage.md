# ViewSTL 2 — native WebGL2 plugin

Version: `2.0.0-rc.5` (ViewSTL v2.00 release candidate, GitHub and npm).
On `main`, the new plugin is in `src/` and `build/`; the legacy tree is in
`legacy/v1/`. The unchanged `master` branch retains original legacy paths.
The v2 website is available at https://preview.viewstl.com/.

## Quick start

Download the plugin ZIP from the [GitHub release](https://github.com/omrips/viewstl/releases/tag/v2.0.0-rc.5),
then copy its complete `build/` folder to `/viewstl-v2/` on your website.
Paste these three lines into your page's `<body>`:

```html
<div id="viewer" style="height:500px"></div>
<script src="/viewstl-v2/viewstl.min.js"></script>
<script>new StlViewer(document.getElementById('viewer'), { models: [{ filename: 'model.stl' }] });</script>
```

Replace `model.stl` with your model's path and open the page over HTTP(S).
You can also drag local files onto the viewer. The full distribution folder is
required so the viewer can find its worker and optional format assets.

## Browser script

Copy the complete `build/` directory to your server, including the
worker, its `chunks/` and `cad/` directories and third-party notices. Then:

```html
<div id="viewer" style="width:100%;height:500px"></div>
<script src="/viewstl-v2/stl_viewer.min.js"></script>
<script>
  const viewer = new StlViewer(document.getElementById('viewer'), {
    models: [{ id: 0, filename: '/models/part.stl', color: '#568bdc' }],
    load_error_callback: message => console.error(message)
  });
</script>
```

`viewstl.min.js` is an identical classic-script alias. The canvas requires
a container with a nonzero height. Files must be served over HTTP(S),
including during local development; browsers restrict workers on `file:` URLs.

## ES modules and npm

```js
import StlViewer from './viewstl-v2/viewstl.js';

const viewer = new StlViewer(container, {
  models: [{ id: 0, local_file: fileInput.files[0] }]
});

await viewer.when_idle();
console.log(viewer.get_model_info(0));
```

The package contains ESM, CommonJS and TypeScript entry points. Importing
the package is safe during server-side rendering; constructing a viewer
requires a browser DOM and WebGL2.

Install with `npm install viewstl`. No version suffix is required: the `latest`
tag selects the current release candidate. The established `@omrips/viewstl`
package is also updated with the same plugin; `npm install @omrips/viewstl`
works without a version suffix. Use either package name consistently in imports
and asset-copy paths; there is no need to install both.

With a bundler, copy the complete `node_modules/viewstl/build/`
directory to your app's public assets (for example `public/viewstl-v2/`), keeping
the worker, `chunks/`, `cad/` and notices together. Set `worker_url` to its served
URL, or provide your bundler's worker factory.
Do not assume a bundler copies a module worker's dynamic chunks merely
because it sees a URL string.

```js
import StlViewer from 'viewstl';

const viewer = new StlViewer(container, {
  worker_url: '/viewstl-v2/viewstl.worker.js'
});
```

For Vite, the optional factory form is:

```js
import ViewerWorker from 'viewstl/worker?worker';
const viewer = new StlViewer(container, {
  worker_factory: () => new ViewerWorker()
});
```

The static-assets/`worker_url` integration above was verified in production
builds using Vite 8.3.4 and Webpack 5.112.0, including STEP/IGES and lazy archive
assets. The optional Vite worker-factory example is separate integration guidance
and was not part of those checks. A factory must return a new worker for each
scheduled job and arrange for all dynamic chunks and CAD assets to be served.
The CommonJS entry point also requires
`worker_url` or `worker_factory` because it cannot infer a browser asset URL.

## Node.js model analysis

Run `npm install viewstl`. Node.js 20+ resolves the analysis
worker and optional CAD WASM directly inside the package; there is no asset-copy
step for server use.

```js
import { analyzeFile } from 'viewstl/node';
const report = await analyzeFile('part.stl', { units: 'mm' });
console.log(report.dimensions_mm, report.surface_area_mm2, report.volume_mm3);
```

CommonJS is supported with `const { analyzeFile } = require('viewstl/node')`.
The `/node` entry point is separate from the browser viewer and has no DOM,
WebGL or Three.js dependency. It supports STL, OBJ, 3MF, STEP/STP and IGES/IGS.
STEP/IGES measurements describe the tessellated mesh, not exact CAD surfaces.
Scene files, rendering, thumbnails and server-side exporting are outside this API.

### Input and units

`analyzeFile(path, options)` accepts a local regular-file path or a `file:` URL
object. `analyzeBuffer(data, options)` accepts a Node Buffer, Uint8Array or
ArrayBuffer, and requires `filename` or `format` to identify the format:

```js
import { analyzeBuffer } from 'viewstl/node';
const report = await analyzeBuffer(uploadBuffer, { filename: 'part.stl', units: 'mm' });
```

The input buffer is copied without modifying or detaching the caller's data.
HTTP(S) URLs and network-share paths are rejected. The module does not fetch
external model resources, run a web service, or write input files to disk.
An application's own upload handler determines how files reach its server and
whether they are stored. Browser-selected files sent to a server are uploads;
the preview website continues to perform its checks on the user's device.

STL and OBJ carry no reliable physical units. Supply `units: 'mm'`, `'cm'`, `'m'`,
`'in'`, `'ft'` or `'um'` when the input scale is known. With no scale, `units` and
all physical measurement fields (`dimensions_mm`, `surface_area_mm2`,
`volume_mm3`) are null; the unit check is inconclusive. The generic `dimensions`,
`surface_area` and `volume` fields then use input coordinate units. When units
are known, these generic fields also use mm, mm² and mm³.

3MF and CAD file units are honored and normalized to mm automatically. They
cannot be overridden with a different input scale. `units_source` is `'file'`,
`'option'` or null. `volume_valid` describes validation of the mesh volume;
it does not confirm a physical scale or guarantee printability. Invalid or
unverified volume is returned as null. `level: 'basic'` skips detailed
intersection and validated-volume checks; the default is `'detailed'`.

### Jobs, limits and cancellation

The convenience functions share an analyzer with two active workers, up to
16 waiting jobs, and at most 128 MiB of copied buffer data waiting in the queue.
Create an independent analyzer when the host needs different concurrency:

```js
import { createAnalyzer } from 'viewstl/node';
const analyzer = createAnalyzer({ concurrency: 1, max_queue: 4 });
try {
  const reports = await Promise.all(paths.map(path => analyzer.analyzeFile(path, {
    units: 'mm', signal: controller.signal, timeout_ms: 60000,
    limits: { max_file_bytes: 32 * 1024 ** 2, max_memory_bytes: 512 * 1024 ** 2 }
  })));
} finally {
  await analyzer.dispose();
}
```

Here `paths` is the application's array of file paths and `controller` is its
AbortController. Keep submitted batches within the configured queue capacity.
`concurrency` is 1–8; `max_queue` may be zero; `max_queued_bytes` controls queued
buffer copies. Exceeding queue admission rejects with `ERR_ANALYZER_BUSY`.
Use a shared analyzer for a service rather than creating an unbounded number
of independent analyzers per request.

Per-job defaults are 64 MiB input, 1,000,000 triangles, 128 MiB expanded archive
data, 1,024 archive entries and a 1 GiB estimated working-set budget. These are
independent ceilings: the memory estimate can reject a mesh below the triangle
ceiling. Override them in `limits` with `max_file_bytes`, `max_triangles`,
`max_uncompressed_bytes`, `max_archive_entries` and `max_memory_bytes`.
Unknown limit names are rejected. CAD input/output and WASM-heap checks are
also applied, and retained CAD memory counts towards the analysis budget.

`timeout_ms` defaults to 120,000 and covers waiting, reading, parsing and checks.
Expiry terminates the worker and rejects with `ERR_ANALYSIS_TIMEOUT`.
`signal` cancels queued or active work with an `AbortError` (`ABORT_ERR`).
`dispose()` cancels outstanding jobs and waits for their workers to terminate.
Workers are also terminated after success or failure before their slots are
reused, releasing parser and CAD state. Processing failures do not disable
the analyzer.

`max_time_ms` separately limits the mesh-check stage (30,000 by default, up to
120,000). It may yield a partial report with `limit_reason: 'time'`. Inspect
`summary` and each check's status; an incomplete check is not a pass.
`on_progress` receives phase and elapsed-time updates. The optional `profile`
uses the same FDM build-volume, overhang, bed-contact and sampled wall-thickness
settings as browser print checks. FDM results remain estimates.

Memory limits are conservative admission estimates plus a worker JS-heap limit,
not a hard limit on process RSS. ArrayBuffers and WASM memory are not fully
covered by the JS-heap limit. Size host/container limits for total concurrency;
use process/container isolation when serving untrusted uploads. The library
does not provide an HTTP endpoint, authentication or a filesystem sandbox.

## Full app controls

`mountViewstlApp` is the optional app controller, exported from the same
`viewstl.js` bundle as `StlViewer` (and as a global in the classic script).
It owns the file queue, memory admission, cancellation, selection, scene
placement, translation/rotation/depth gestures, viewing modes, sectioning,
colors, grid, PNG downloads, keyboard handling, and control state.

```js
import { mountViewstlApp } from './viewer/viewstl.js';
const app = mountViewstlApp(document, {
  sample_url: new URL('./sample-vase.stl', import.meta.url).href,
  sample_name: 'Twist vase.stl'
});
await app.openFiles(fileInput.files);
console.log(app.getState()); // detached metadata snapshot, no geometry copies
app.dispose(); // cancels work and releases listeners, workers and WebGL
```

This controller binds the preview's HTML control layout; the host supplies
markup and CSS. The reference layout is `Viewstl/site/index.html` in the sibling
website workspace. `requiredControls` in `src/app.js` validates the control
IDs before registering handlers. Missing controls and duplicate mounts produce
a descriptive error. Custom integrations without that layout use `StlViewer`.
Branding, page metadata, advertisements and static help/privacy text belong
to the host page. The preview's JavaScript is only the initialization call.

For an embedded app, pass an `HTMLElement` containing the layout. Queries,
keyboard events and drops are scoped to that root. For multiple roots, prefix
each layout's IDs and label/ARIA references and pass the matching `id_prefix`;
the controller separates radio groups as well. `dispose()` permits remounting
and prevents late reads from updating the new app.

Optional shortcut buttons can reuse the app actions without extra host-side
JavaScript. Use `data-open-file` for Open, and `data-viewstl-shortcut` with `save`,
`select`, `front`, `right`, `top`, `back`, `left`, `bottom` or `isometric` for the
other actions. Save requires the normal save-dialog control group. These
buttons do not add required control IDs, so existing app layouts remain valid.
Use real buttons with descriptive labels/tooltips. The host supplies responsive
CSS; the ViewSTL website shows its shortcut row only on wide desktop screens.

`select` toggles click-to-select mode and reflects it through `aria-pressed`.
Camera gestures pause in this mode; clicking a model opens its existing tools.
Escape, a camera shortcut or entering a model transform tool exits selection
mode. A viewport resize also exits when all selection shortcuts become hidden.
This is temporary interaction state, not a saved scene property. The existing
double-click and Models-list selection mechanisms remain available.

`openFiles()` accepts Files or configured `{name, url, size?}` sources and
resolves when the queue settles. File errors appear in the notice; success is
reflected by `getState().models`. Other methods are `select(id)`, `remove(id)`,
`cancelLoading()` and `clear()`. An omitted `sample_url` hides the sample action.
`worker_url`, `worker_factory` and `worker_timeout` support alternate hosting,
bundlers and CommonJS use.

Loading the bundle does not create a canvas or worker. The first file creates
the WebGL2 viewer. App source modules are bundled into `viewstl.js`; the host
ships no separate memory/layout/transform helpers. Worker JS, archive chunks
and CAD WASM remain separate plugin-owned assets to keep parsing off the main
thread and avoid downloading CAD code for STL/OBJ users.

`get_model_info()` also exposes copied source `bounds`, `has_colors`, and
`source_units` (`null` for unitless sources), so consumers need not inspect
internal geometry or retain its buffers.

## Rendering and file processing

- WebGL2 only; no CanvasRenderer, WebGL1 or IE fallback.
- No Three.js or other third-party library in the STL/OBJ rendering core.
- ASCII/binary STL, VisCAM/MeshLab and Materialise colors, plus the legacy
  ViewSTL colored-STL convention.
- OBJ polygon fan triangulation and negative indices. OBJ materials,
  textures and robust triangulation of concave polygons are not included.
- Core 3MF meshes, nested components, build transforms, units, base
  materials and vertex colors. Root model relationships are followed.
  Texture/composite materials, external component parts and unsupported
  required extensions produce explicit errors rather than silent loss.
- STEP/STP and IGES/IGS solid/surface import via the optional pinned
  Open CASCADE WASM reader. Units normalize to millimetres; assembly placements
  and mesh/face colors are retained. All surfaces in a file form one model.
  The display mesh is an approximation (relative deflection 0.001, angular
  deflection 0.5 radians), not an exact CAD editing or measurement kernel.
  Use self-contained exports: external part files are not fetched, and native
  SolidWorks/Solid Edge formats, feature history, PMI and curve-only files are
  unsupported. Incomplete external-reference assemblies may lack parts.
- Deploy the entire `build/cad/` directory alongside `chunks/` and the worker.
  CAD code/WASM is loaded only for CAD files; local input bytes are never uploaded.
  Each job's worker is terminated on completion, cancellation, error or timeout.
  CAD admission estimates 128 MiB plus 40 times the input size. The WASM heap
  is separately capped to at most 512 MiB and to part of the remaining scene
  budget. Output arrays and triangle counts are also checked; these checks
  cannot predict exact peak browser/GPU memory for every CAD file.
- A strict CSP must allow `script-src 'self' 'wasm-unsafe-eval'` for the worker;
  JavaScript `unsafe-eval` is not needed. Serve `.wasm` as `application/wasm`.
  `scripts/prepare-cad.mjs` replaces the pinned glue's dynamic bindings with
  static closures and adds its heap ceiling. The WASM is unmodified. Adapted
  glue, the recipe, license texts and source references ship with the assets.
- VSJ JSON and VSB archives containing `json_data.vsj` and STL files.
- ZIP/3MF uses separately loaded worker chunks containing pinned fflate,
  saxes and xmlchars. Those chunks are not fetched for ordinary STL/OBJ.
- ZIP accepts stored and deflated entries, validates CRC/length and bounds
  expanded data. ZIP64, encryption and multi-disk archives are unsupported.
- Local files never leave the browser. Remote URLs obey normal CORS and
  same-origin credential rules; there is no upload service or CORS proxy.

Parsing, bounds, flat normals and initial requested smooth/edge geometry
are calculated in workers. Results use transferable buffers. Workers are
bounded and terminated after jobs, on cancellation, and on disposal.

Changing an already-loaded model to smooth/edges/wireframe derives its
additional data in a worker. That operation intentionally copies positions
once, since the main thread retains them for synchronous export and picking.
Nonuniform-scale area queries also require a cached synchronous scan. These
are distinct from the initial file handoff, which does not clone geometry.

Rendering runs only when needed, including during interaction and animation.
Transparency uses model-level back-to-front sorting; intersecting transparent
surfaces can still have ordering artifacts. STL export stores face color,
so a 3MF triangle's per-vertex gradient cannot survive STL/VSB export exactly.

## Model animation

Animation is included in `2.0.0-rc.5` on GitHub and in both npm packages.
Playback remains inside the native WebGL2 plugin.

After a model has loaded, one call starts continuous rotation:

```js
await viewer.when_idle();
viewer.animate_model(0, {
  delta: { rotationz: 2 * Math.PI, msec: 5000, loop: true },
});
```

The legacy `animation` model option also works. `delta` adds a change to the
starting pose; `exact` interpolates toward an absolute target. They can operate
together on different properties and finish independently:

```js
viewer.animate_model(0, {
  delta: { rotationx: 1, rotationy: 1.1, rotationz: 1.2, msec: 1000, loop: true },
  exact: { x: 1000, y: 150, z: 200, scale: 5, msec: 3000 },
});

viewer.pause_model_animation(0);  // Keep the pose and elapsed time.
viewer.resume_model_animation(0);
console.log(viewer.get_model_animation_state(0));
viewer.animate_model(0, null);    // Stop at the current pose; discard playback.
```

Supported properties are `x/y/z`, `rotationx/y/z` in radians and
`scale` or `scalex/scaley/scalez`. Durations are positive milliseconds, defaulting
to 300. Scale deltas are additive, as in the legacy API; all resulting scales
must stay positive. Only delta tracks repeat, accumulating their change each
cycle. A negative looping scale delta is rejected. Delta and exact may not claim
the same property. Inputs must be finite and within JavaScript's safe numeric
range. Invalid replacements leave the current animation intact.

Starting a new animation replaces the old one from the current pose. Manual
position, rotation, scale and unit setters stop that model's playback first.
Camera interaction, color and viewing-mode changes remain usable. Completed
tracks no longer write their properties. Removal, `clean()` and `dispose()`
release playback; paused/completed models do not keep the render loop running.

Timing follows elapsed frame timestamps, not frame count. Hidden documents and
lost WebGL contexts suspend playback without including that gap on resumption.
User pause is independent of this automatic suspension. State queries return
`status`, `elapsed_ms`, `suspended` and active `tracks`; unknown IDs return null.

Set callbacks in the viewer options:

```js
const viewer = new StlViewer(container, {
  animation_state_callback(id, state, reason) {
    console.log(id, state.status, reason);
  },
  animation_complete_callback(id, state) {
    console.log('Finished', id, state.elapsed_ms);
  },
});
```

Callbacks describe transitions, not every frame, and are deferred until the
current operation finishes. Completion fires once when every track finishes;
an animation with a looping track does not complete. Call playback controls on
loaded models, for example after `when_idle()`.

VSB/VSJ preserve the animation definition, original pose, elapsed phase, rotation
pivot and pause flag. Both scene-loading APIs start incoming animations together
after all incoming models load. VSJ still needs its referenced model files.
Animated VSB entries retain unscaled mesh data and explicit scale metadata;
static entries retain the previous scale-baked convention. This prevents scale
being applied twice. Older viewers may read the pose but cannot restore the new
playback-state extension exactly.

PNG and modern `export_models()` capture the current pose without stopping
playback. Legacy `get_stl_bin()` keeps its documented scale/centering-only export
convention. Regular model files do not store animation. Print checks should run
while the affected models are paused; subsequent motion makes the report stale.

A self-contained example is in `examples/v2/animation.html` in the source
checkout (serve with `pnpm start`). It includes Play, Pause, Resume, Stop and Reset.

The app controller also supports an optional `animation-*` group (see the new
site's HTML template): `animation-details`, `animation-fields`, `animation-axis`,
`animation-seconds`, `animation-direction`, `animation-play`, `animation-pause`,
`animation-stop`, `animation-status` and `animation-error`. Supply the whole group
or omit it. It exposes selected-model spin around the mesh center, duration
(0.1–3,600 seconds per turn), direction and playback buttons. Other models keep
playing when selection changes. Manual tools capture the current animated pose.
Readouts update at most four times per second; geometry and GPU buffers are reused.

`mountViewstlApp` composes `animation_state_callback` and
`animation_complete_callback` options with its own UI behavior. `app.getState()`
includes each model's current transform and `animation` state. Ordinary files
never auto-spin. Imported running animations are paused when the browser reports
`prefers-reduced-motion: reduce`; explicit user playback remains available.

App print checks pause running target models. Optional `print-resume` and
`print-animation-note` elements expose resumption; closing the panel does not
silently restart motion. Resuming clears stale results and keeps the panel open.
Scene saving includes playback; PNG and regular model saving capture a pose.

## Existing API and intentional differences

The existing constructor, model options and documented method names are
implemented. See [the full inventory](v2-compatibility.md). Existing getters
remain synchronous. `get_vsb_blob()` continues to return a Promise.

- `width` / `height` override their `canvas_width` / `canvas_height` aliases.
- `bg_color` overrides `bgcolor`.
- `on_model_mousedown` overrides `on_model_mouseclick`; both setter names work.
- `set_model_units(model_id, units, scale)` keeps the executable three-argument
  signature. The old documentation omitted `model_id` incorrectly.
- `load_three_files: 'directory/'` remains a legacy alias for the worker
  directory, resolved against the page. It never loads Three.js. An explicit
  `worker_url` takes precedence; false/omitted uses the entry point's directory.
- `jszip_path` and `jszip_utils_path` are accepted deprecated options, with
  no effect: archive support is shipped in the package's lazy worker chunks.
  No scripts are fetched from those legacy paths.
- `get_model_info().dims` now updates after scaling. The old implementation
  returned stale dimensions even when area and volume had changed.
- Zero IDs, zero coordinates, zero rotations and zero opacity are valid.
  Invalid positive-only scales, colors, transforms and IDs report errors.
- Model-loading batches preserve the legacy final callback order:
  `all_loaded_callback` precedes the final `model_loaded_callback`.
  Failed/cancelled jobs settle the batch instead of leaving it hanging.
  An empty initial viewer does not emit `all_loaded_callback`.
- `set_center_models` controls centering of subsequently loaded models.
- Model data remains CPU-resident for synchronous export/picking and context
  restoration. `clean()` and `dispose()` release GPU buffers and worker jobs.
- `dispose()` removes only the viewer's owned DOM/listeners, not its siblings.
- The renderer, camera and models are native objects. Direct Three.js calls
  into `.camera`, `.scene`, `.renderer`, or `.models` are not compatible.

STL export retains the legacy convention: geometry scale and centering are
baked into vertices; scene position and rotation are not baked. VSB saves
position/rotation in its manifest and avoids applying scale twice.

Volume is a signed-tetrahedron mesh calculation reported as an absolute
value, not a watertightness or printability certification. For inch models,
area/volume follow the legacy conversion convention.

## Optional Three.js mesh bridge

The ordinary viewer never imports Three.js. To request a real Three.js
Mesh from `get_model_mesh`, pass your own instance:

```js
const viewer = new StlViewer(container, { three: THREE });
// after loading:
const mesh = viewer.get_model_mesh(0);
```

The bridge uses `options.three` or `globalThis.THREE`. With neither present,
`get_model_mesh` reports a load error and returns null. It does not return
a misleading imitation Mesh.

Import supports static BufferGeometry meshes and legacy Geometry vertices/
faces. It copies geometry and basic material color/opacity. Placement is
controlled by the supplied model options, as in the old plugin. Skinning,
instances, morph targets, child objects, multiple/textured/shader materials
are rejected. Export returns an independent BufferGeometry Mesh. Dispose
the returned mesh's geometry and material when finished with it.

Use `get_model_data(id)` for a native copy of raw geometry, and
`add_model({ data, ...options })` to add it without Three.js. Data does not
include scene transforms; copy those options explicitly when duplicating.

Use `get_image_blob()` for screenshots; direct `renderer.domElement.toDataURL`
outside a draw is not guaranteed because continuous drawing-buffer
preservation is disabled.

## Additional options and helpers

| Option | Default |
| --- | --- |
| `worker_url` | Beside the ESM/classic script |
| `worker_factory` | None |
| `worker_count` | 2, allowed range 1–4 |
| `worker_timeout` | 120,000 ms per job |
| `pixel_ratio` | Device pixel ratio capped at 2 |
| `max_file_bytes` | 256 MiB |
| `max_triangles` | 5,000,000 |
| `max_uncompressed_bytes` | 256 MiB per archive |
| `max_archive_entries` | 1,024 |
| `max_memory_bytes` | `Number.MAX_SAFE_INTEGER` (optional estimated working-set budget) |

Limits are configurable positive integers. These are ceilings, not guarantees
that every mobile device has enough memory for the maximum. Derived smooth
normals/edge maps can use substantially more memory than flat rendering.

`max_memory_bytes` adds conservative checks for parsed geometry, text parsing,
archive expansion, expanded 3MF instances, and derived smooth/wire/edge maps.
It estimates working memory, including GPU buffers; it does not measure free
memory. Existing default byte/triangle limits remain unchanged for embedders.
The ViewSTL preview site configures its own device-dependent limits: half the
approximate `navigator.deviceMemory` report, or half a 2 GiB fallback if absent.
This leaves a 50% margin against that estimate, not a guaranteed allocation or
protection against an OS/browser killing an exhausted tab.

Local binary STL files are parsed in chunks of at most 65,536 triangles
(3.125 MiB input data) plus their 84-byte header. This avoids holding a complete
input file and a second assembled copy alongside geometry. ASCII/OBJ/archive
input is still read as a complete buffer; OBJ no longer creates a full array
of every input line. Native GPU allocation errors clean up partial resources
and report through `load_error_callback`.

`when_ready` resolves after renderer initialization, before initial models
finish. `when_idle()` waits for pending model, scene and derived-geometry
work; inspect `load_error_callback` for individual failures. `get_image_blob`
waits for that work, draws and returns a PNG Blob by default.

Keyboard: arrows orbit; + / - zoom; F fits the scene. Mouse: drag orbits,
shift/right/middle drag pans, wheel zooms. Touch: one finger rotates and
two fingers pan/pinch. Real mobile-device validation remains necessary.

For a same-origin standalone deployment, allow your script and worker assets
in the site's Content Security Policy (`script-src 'self'; worker-src 'self'`),
and permit intended remote model hosts in `connect-src`. SharedArrayBuffer,
cross-origin isolation, eval and worker blob bootstrapping are not required.

## Additional views and section cuts

The existing `flat`, `smooth` and `wireframe` display values remain supported.
New display values are `edges` (solid with 30-degree feature edges), `mesh`
(triangle overlay), `xray`, `studio` and `orientation` (blue front faces, red
back faces). None requires Three.js. `view_edges` / `set_edges` retain the
legacy one-degree edge threshold.

```js
viewer.set_view(0, {display: 'studio', smooth_shading: true});
await viewer.when_idle();
viewer.set_smooth(0, false); // Independent of the selected modern view
viewer.set_section(0, {axis: 'z', position: 0.5, flip: false});
viewer.set_section(0, null); // Restore the complete model
```

These fields are also accepted in model options, returned by `get_model_info`,
and preserved by VSJ/VSB scene export. `set_display('flat')` and
`set_display('smooth')` keep their legacy shading behavior. Smooth shading is
ignored visually in wireframe and retained for the next surface view. Derived
view changes commit after preparation succeeds; a rejected memory estimate or
failed worker preserves the previous appearance. Wait for `when_idle()` and
inspect `load_error_callback` as with model loading.

Mesh overlay uses shader barycentric coordinates without an extra geometry
buffer. Studio, orientation, X-ray and clipping also reuse existing geometry.
Smooth normals, wireframe and feature edges are computed on demand in a worker
and checked against the memory budget, including cached derived arrays.

Section position is a fraction from 0 to 1 of the source model's bounding box
along its chosen axis. The plane follows model transforms, clips picking and
PNG rendering, and does not modify exported STL geometry or model statistics.
The cut remains open, with an amber boundary highlight; no cap is generated.
X-ray uses lightweight back-face/front-face alpha passes; it is an illustrative
view, not exact order-independent transparency for intersecting surfaces.
Face orientation describes winding relative to the camera, not an automatic
watertightness or printability diagnosis.

## Optional streaming URL imports

The plugin does not silently route existing `filename` requests through a server.
To retrieve a public URL without depending on the source server's CORS policy,
configure a same-origin relay and explicitly use `remote_url`:

```js
const viewer = new StlViewer(container, {url_import_endpoint: '/api/import-url'});
viewer.add_model({id: 0, remote_url: 'https://example.com/model.stl'});
// Optional remote_format: 'stl', 'obj', '3mf', 'step', 'stp', 'iges', 'igs'.
```

`mountViewstlApp` accepts the same endpoint and exposes `app.openURL(url, format)`.
Its optional `url-dialog`/`url-form` controls are shown in the preview site's HTML.
The site supplies markup, styles and configuration; URL interaction, loading,
progress, cancellation and parsing live in the plugin. App jobs allow ten minutes
by default; low-level viewer worker_timeout remains configurable as before.

The relay receives the URL in a JSON POST body and streams the response without
file storage. A signed URL's query string is not displayed as a model name or
included in scene exports. Local files still never leave the browser. URL imports
are a separate privacy path: the relay sees the remote bytes in transit.

Binary STL is decoded incrementally in the worker. Other formats use bounded
browser buffers, including archives and CAD. A complete model appears after
download and validation; progressive partial rendering is not implemented.
`get_model_info().file_bytes` reports the imported byte count when available.
Downloaded names are metadata, not reloadable URLs; use VSB to package a scene
containing these models. Embedders must provide their own compatible relay; no
ViewSTL server is implicitly used by the library.

When `url_import_endpoint` is configured, `mountViewstlApp` also accepts dropped
links (`text/uri-list`), Firefox URL/title data, and plain HTTP/HTTPS URL text.
URL drops use `openURL` and its existing queue, relay, progress, cancellation and
error handling. Multiple URI-list links are deduplicated per drop. Local files
take priority over accompanying URL metadata. Plain text is not searched for
embedded links, HTML drag contents are not parsed, and drops into text inputs or
editable content retain their normal behavior. This belongs to the optional app
controller; the low-level viewer's existing file-drop contract is unchanged.

The reference relay lives in the website repository's `relay/` directory. Its
request is `{url, format, max_bytes}` and its response supplies X-ViewSTL-Format,
percent-encoded X-ViewSTL-Filename, and optional Content-Length. All relay and
parser failures use the existing error callback. Cancellation terminates the
worker/fetch; the server then closes the upstream connection.

## Local mesh export

The optional `mountViewstlApp` controller can bind a Save dialog using the
`save-*` control group in the preview site's `site/index.html`. Include the entire
group or omit it; incomplete groups fail before mounting. All event handling,
selection, progress, cancellation and download dispatch compile into `viewstl.js`.
The host supplies markup, styles and explanatory copy (format option `data-note`
attributes and the CAD limitation paragraph). No Save UI is injected by the
low-level viewer.

The reference dialog exports only the current app selection for mesh formats,
with positions/rotations applied and millimetre output. Unitless STL/OBJ inputs
are assumed to be millimetres. Its optional color setting applies to OBJ/3MF;
colored OBJ uses ZIP. It calls `download_models` with explicit model IDs, so
closing an editing panel does not clear the export selection. VSB/VSJ always
export the whole scene. `save-scope` is a text status element displaying the
selected filename or whole-scene model count, not a scope dropdown. Cancel, Escape,
the close button, backdrop dismissal, changing selection, starting an import,
removing/clearing models and app disposal cancel an active export. Errors stay
in the dialog and permit another format. Existing PNG controls remain separate.

All exporters live in the plugin and run in disposable workers. They generate
local Blobs; no relay, upload, server conversion or third-party network endpoint
is used. Export modules and ZIP compression load only on demand. STEP/IGES writing
uses JavaScript and does **not** download the CAD importer or WASM engine.

```js
await viewer.when_idle();
const controller = new AbortController();
const result = await viewer.export_models({
  format: '3mf',                    // stl, obj, 3mf, step/stp, iges/igs
  model_ids: [0, 2],               // omitted = all; 'selected' = selected model
  filename: 'assembly',            // correct extension added/replaced automatically
  units: 'mm',                    // mm (default), inch
  apply_transforms: true,          // default: bake position, rotation, scale and centering
  colors: true,                   // default for OBJ/3MF; ignored for STL/STEP/IGES
  signal: controller.signal,
  on_progress({ loaded, total, phase }) {
    // Triangle counts. phase is 'exporting' or 'complete'.
    // Encoding can reach total before ZIP packaging completes.
  },
});
// {blob, filename, format, units, model_ids, triangles, representation: 'mesh'}
// Keep result.blob, or use the convenience method to initiate a browser download:
await viewer.download_models({format: 'step', model_ids: 'selected'});
// controller.abort() rejects an active/queued operation with AbortError.
```

Exports capture the model state at dispatch; subsequent edits/removal do not
change an in-flight export. Buffers used for rendering are never transferred or
detached. No selection, an unknown ID, duplicate IDs or an unfinished model
rejects the promise. Call `when_idle()` first to include pending imports. Errors
reject the promise and progress goes only to the supplied callback; exporters do
not show dialogs or invoke the viewer's import-error callback. A throwing progress
callback rejects its export and terminates the worker. `clean()`/`dispose()` cancel
active and queued jobs. The caller owns the returned Blob and its lifetime.

`apply_transforms: false` exports source coordinates and their accumulated unit
conversion, without centering, presentation movement/rotation or user scaling.
Scene coordinates are treated as millimeters; `units: 'inch'` divides output
coordinates by 25.4 and writes inch metadata where the format supports it.
Unitless inputs must be interpreted/scaled appropriately by the embedding app.
STL and OBJ have no standardized units; OBJ includes an informational comment.

| Format | Output and scope |
| --- | --- |
| STL | Standard binary STL; selected meshes combined into one triangle stream. Attributes are zero, so no ambiguous vendor color encoding. |
| OBJ | With `colors: true`, a ZIP containing `model.obj` and `materials.mtl`, including object groups, face normals, per-face colors and opacity. Vertex colors are averaged per face and colors/opacity quantized to 8-bit channels. With `colors: false`, a plain `.obj` file. |
| 3MF | ZIP/XML package with separate mesh objects, indexed vertices, units and per-vertex color/opacity using the Materials extension. Requires non-degenerate triangles, paired consistently oriented edges, and positive volume. Open/inconsistently wound meshes reject; there is no automatic repair or full self-intersection validation. |
| STEP | AP214 `AUTOMOTIVE_DESIGN`: separate named products made of planar triangle faces in open shells. Exact displayed mesh coordinates are written; this is a surface model, not a reconstructed CAD solid. |
| IGES | IGES 5.3 bounded planes (108/form 1) with closed 3D polylines (106/form 12). Models use separate levels. Triangle surfaces, not stitched CAD solids. |

STEP/IGES preserve mesh geometry and placement, but omit colors, textures,
analytic curves, original CAD topology/assemblies and feature history. They work
with open triangle meshes, but reject zero-area triangles. No F3D export is
provided. A consuming site can describe these limitations in its own interface;
the low-level export API is UI-free. CAD interoperability has been verified
against Open CASCADE, not every commercial CAD application.

Section cuts, camera orientation, grid, selection frames and viewing/shading modes
are presentation settings and do not modify exported geometry. Use VSJ/VSB for
ViewSTL scene settings. Texture/UV data discarded at import cannot be recreated.

The scene memory budget includes pending exports. Output is encoded in chunks
instead of building one large text string; Blobs still require browser storage
and this API does not stream directly to a filesystem handle. Output obeys
`max_file_bytes`, archives also obey `max_uncompressed_bytes` and
`max_archive_entries`, and the complete selection obeys `max_triangles`.
Conservative format-specific memory estimates can reject an export before copying
geometry. Cancellation terminates its worker, including compression.

The existing synchronous `get_stl_bin`/`download_model` and VSJ/VSB methods retain
their legacy behavior. Use the new API for scene transforms, correct filename
extensions, asynchronous execution and cancellation.

## Development and packaging

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm check:types
pnpm check:node-types
pnpm check:legacy
pnpm start
pnpm pack
```

Open `/examples/v2/` for the demo and `/tests/v2/browser.html` for real worker/
WebGL checks. `pnpm pack` builds a local tarball; it does not publish anything.
The package allowlist includes v2 artifacts, types, documentation and license
notices. It excludes legacy snapshots, old dependencies, tests and server data.

Before a stable release, validate real mobile hardware, Safari and Firefox,
larger user fixtures, npm/bundler integrations and the integrations used by
the production site. Automated and desktop browser results are recorded in
[verification](v2-verification.md).

## Multiple models, colors and an infinite grid

Use `center_models: false` to preserve the coordinates in assembly files, then call
`add_model` / `add_models` to append files. `set_position` changes presentation
coordinates without rewriting source geometry. The preview site's Models panel
adds selection, individual removal and reversible side-by-side placement.

```js
const viewer = new StlViewer(element, { center_models: false });
viewer.add_models([{id: 0, local_file: partA}, {id: 1, local_file: partB}]);
await viewer.when_idle();
viewer.set_color(0, '#dd766b');
viewer.set_color(0, null); // Restore embedded file colors (or neutral gray if absent).
viewer.set_bg_color('#202d35');
viewer.set_infinite_grid(true, 1, 0); // enabled, base spacing, Z height
```

The infinite XY grid is a procedural shader. Its spacing adapts as the camera
zooms and it fades near the horizon. Panning does not allocate a larger grid;
opaque models occlude it. `set_grid` retains its existing finite-grid behavior.
Infinite settings round trip through VSJ/VSB as `infinite_grid: {spacing,height}`.
Colors change shader uniforms without rebuilding the mesh buffers.

An explicit `max_memory_bytes` budget now covers the whole scene, including
resident geometry, cached view arrays and pending derived geometry. Parsing is
serialized under that budget so each new model receives the remaining allowance.
Removing a model frees its allowance and cancels its pending derived work.
These remain conservative estimates, not measurements of free RAM or GPU memory.

### Selecting a model for editing

`set_selection(id)` draws a light 3D bounding frame using that model's transform.
`set_selection(null)` clears it. The frame uses one 288-byte vertex buffer, follows
rotation/translation/scale without rebuilding mesh buffers, and is excluded from
PNG and scene exports. Removing or clearing its model releases the frame.

`pick_model(clientX, clientY)` returns `{id, distance}` for the nearest visible
surface, or `null` for empty space. Coordinates use the same viewport coordinate
system as mouse events. It respects transforms, hidden models and section cuts.
The preview calls it on double-click only; ordinary dragging does not run a mesh
intersection scan. The existing legacy click callbacks retain their behavior.

The preview provides Move, Rotate and Depth controls per model. Rotation uses
degrees in the UI and compensates for the original mesh center; the plugin's
`set_rotation` API continues to accept radians with its existing origin behavior.
Depth translates along the eye-to-model ray while holding the camera fixed.

## Saving ViewSTL scenes

Use `export_scene` for a Blob or `download_scene` for a browser download:

```js
const result = await viewer.export_scene({
  format: 'vsb', // or 'vsj'
  filename: 'my-scene',
  signal: abortController.signal,
  on_progress({ loaded, total, phase }) {
    // Model counts; exporting, packaging (VSB only), complete.
  },
});
await viewer.download_scene({ format: 'vsj', filename: 'scene', force_basename: true });
```

Both methods always capture the entire loaded scene. They return `{blob,
filename, format, model_ids, triangles, representation: 'scene'}`. Pending loads,
empty scenes, excess model/triangle counts, memory and output limits reject.
Errors reject the Promise instead of using the import-error callback. Cancellation
and throwing progress callbacks release the worker and memory reservation.

VSB uses the existing ZIP layout: `json_data.vsj` plus one colored binary STL per
model. Mesh encoding and compression run in a disposable worker using copied
snapshot buffers; renderer buffers remain intact. Camera, background, grid,
transforms, model colors/opacity, viewing modes and sections stay in the manifest.
Original model names are kept as `orig_filename`. As with the legacy VSB format,
STL geometry uses float32 positions and 5-bit per-face colors, taking the first
vertex color of each triangle. Texture/UV data and original CAD topology/history
are not reconstructed or included.

VSJ is JSON settings and model references, without embedded geometry. The
`force_basename` option defaults to false for API callers; the preview uses true
to write only filenames. Referenced files must be supplied separately. A local-file
reference alone does not grant browser access to a file on disk. VSB is the
self-contained choice. The preview opens both formats through the file picker,
drag and drop, and URL opening. Existing `get_vsj`, `get_vsb`, `get_vsb_blob` and their legacy
download methods retain their signatures and behavior.

In the app Save dialog, VSB/VSJ save the entire scene. STL/OBJ/3MF/STEP/IGES save
only the selected model. There is no user-selectable scope dropdown. The low-level
`export_models` API still permits explicit multiple-model selections for embedders.

## Opening ViewSTL scenes

Use the Promise-based `import_scene` API for local files or public URLs:

```js
const result = await viewer.import_scene(sceneFile, {
  files: companionFiles, // File[]: model files referenced by a local VSJ.
  signal: abortController.signal,
  on_progress({ loaded, total, phase }) {
    // reading-scene: reader progress; opening-model/complete: model counts.
  },
});
console.log(result.model_ids, result.scene, result.used_files);

// Requires the viewer's same-origin url_import_endpoint configuration.
await viewer.import_scene('https://example.com/scene.vsb');
await viewer.import_scene('https://example.com/download?id=123', { format: 'vsj' });
```

VSB archives contain `json_data.vsj` and their model files. VSJ manifests reference
separate files: supplied local files match by exact relative path or unambiguous
basename. Missing or ambiguous files reject with an actionable error. Absolute
HTTP/HTTPS references use the configured URL relay. For a remote VSJ, relative
references resolve against its final directory after redirects, also through the
relay. Local files and manifests are not uploaded. The relay streams remote files
without saving them. It still applies its request, size and network limits, so a
scene with many remote references can hit the relay's rate limit.

Imports append models with new IDs and restore camera, background/grid, transforms,
colors/opacity, view modes, smoothing and sections. Saved centering is converted
to equivalent model positions without changing existing models' centering. Embed
canvas size and resize/mouse controls are not imported. The development animation
update also restores per-model animation and preserves its original pivot.
Scene reading and mesh parsing use workers and the existing memory/triangle/archive
limits. Models become visible together after all have loaded. Errors, cancellation,
or a throwing progress callback remove the incoming models and retain the existing
scene. `clean()` and `dispose()` also cancel pending scene imports. Existing
`load_vsj` and `load_vsb` retain their previous signatures and behavior.

In the preview, choose or drop a local VSJ together with its referenced model files;
companions used by the scene are not added twice. A VSB needs no separate files.
Choose VSB/VSJ explicitly in Open URL for a URL without a scene extension. Scene
opening, progress, cancellation and restored editing controls all live in the
plugin's app controller; the website initializer remains minimal.

## Checking meshes for 3D printing

The optional checks run locally on demand. They analyze the loaded triangle mesh
from any supported format, including models restored from VSB/VSJ. CAD accuracy
is limited by the imported tessellation. Analysis does not repair or modify models.

```js
const controller = new AbortController();
const report = await viewer.check_printability({
  model_ids: [selectedId], // Omit for all loaded models; 'selected' uses the editing selection.
  level: 'detailed',      // 'basic' is the default.
  apply_transforms: true, // Default: current placement/rotation/scale, like mesh export.
  units_confirmed: true, // Confirm the current mm scale for unitless input.
  profile: {             // Optional; omit for geometry checks only.
    technology: 'fdm',
    build_volume_mm: [220, 220, 250],
    min_wall_mm: 0.8,     // User-chosen thresholds, not universal printing rules.
    overhang_degrees: 45 // Measured from vertical; +Z is print up.
  },
  max_time_ms: 30000,    // Per model, maximum 120000.
  signal: controller.signal,
  on_progress: ({ phase, model_index, total_models }) => console.log(phase)
});
if (viewer.is_printability_current(report)) {
  viewer.show_printability(report, { model_id: selectedId, issue: 'boundary_edges' });
}
viewer.clear_printability();
```

Basic checks cover degenerate and nearly degenerate triangles, duplicates, open
boundaries, non-manifold edges and vertices, inconsistent winding, connected
components and physical-unit provenance. Detailed checks add a native-JavaScript
BVH for self-intersections (including coplanar overlaps), shell containment,
orientation and enclosed volume. Separate components can be intentional. Hollow
models require opposite cavity-shell orientation. Vertex connectivity uses exact
source coordinates; small gaps are not silently welded closed. Intersection
checks use the reported scale-dependent numerical tolerance; near-contact cases
can be inconclusive. The existing 3MF export guards remain independent and unchanged.

Optional FDM checks compare dimensions with a build-volume box, identify potential
overhang regions, estimate bed contact and sample wall thickness. `line_width_mm`
can supply the wall threshold when `min_wall_mm` is omitted. No printer defaults
are assumed. Build fit tests current orientation dimensions, not actual placement,
exclusion zones or alternative rotations. Bed contact virtually lowers each model
to its minimum Z; the visible grid and camera do not define the print bed.
Thickness tests at most 2,048 face centres using inward normal rays and can miss
small features or oblique thin regions. No finding from those samples is explicitly
inconclusive, never proof of a minimum thickness. Overhangs do not simulate
bridging/supports; contact area does not predict adhesion/stability. Resin, toolpaths,
cross-model collisions and Boolean unions are outside these checks.

Reports include each check's `pass`, `issue`, `inconclusive` or `not_run` status,
severity, counts, explanations, bounded highlight samples, dimensions, tolerance,
timing and optional estimates. `volume_valid` means a geometrically validated
enclosed volume; its physical size still depends on the `units` check. Overall
status is `issues_found`, `incomplete` or `no_issues_found`. A basic report remains
incomplete because detailed checks were not run. Errors and time/memory limits
never imply a pass. This API does not certify a successful print.

Workers and analysis modules load only when requested. Models are checked in
sequence, with cooperative snapshot copying and aggregate memory admission.
The working estimate is 64 MiB plus 2,400 bytes per triangle, with bounded report
allowances; a model that can be viewed may be too large to analyze on the same
device. One bounded report cache is retained, not the topology/BVH. Geometry,
transforms, scale and unit changes invalidate reports; colors and camera changes
do not. Removing a checked model, clean/dispose, AbortSignal cancellation or a
throwing progress callback releases the active worker and reservations. Report
metadata uses weak references so retaining a report cannot retain removed meshes.

Highlights use temporary native WebGL line buffers and are excluded from PNG,
mesh and scene exports. They show up to 128 faces or 256 edges per check, through
occluding surfaces. Closing the site panel clears highlights. The preview exposes
the feature under **Info → Check for 3D printing**, with selected/all model scope,
basic/detailed depth and collapsed optional FDM settings. Unit confirmation resets
when the checked scope or an existing result's geometry/transform changes. A complete
optional `print-*` control group is bound by `mountViewstlApp`; hosts omitting the
entire group keep their previous behavior. The website only supplies markup/styles.

The check panel stays open while using the canvas, other controls or dialogs,
loading files, selecting models and clearing the scene. Only its close button or
Escape with focus inside the panel dismisses it. Reopening it from Info reveals
and focuses the existing panel. Loading or changing the checked selection cancels
an active check; stale results are cleared. Loading and empty scenes disable Run
and show the current availability without closing the panel.

## Model size, units, duplicates, cameras and measurements (rc.6)

All operations below are implemented inside the plugin. The optional site controls remain a thin HTML/CSS host.

`viewer.resize_model(id, [2, 2, 2])` doubles the model about its world-space bounds center, preserving rotation and placement. Positive finite XYZ factors are required; independent factors allow nonuniform scaling. It stops only that model's animation. `get_model_size(id)` returns dimensions and the reset baseline in millimetres. `reset_model_size(id)` restores that baseline while retaining file-unit corrections.

`viewer.set_file_units(id, 'inch')` reinterprets a unitless STL/OBJ mesh (default mm) without moving its center. Switching back reverses the conversion. Explicit 3MF/STEP/IGES units are normalized to mm during parsing and cannot be reinterpreted. `set_display_units('inch')` changes the optional app's size/Info readouts only; scene coordinates, position controls and the grid remain in mm. Existing `set_model_units` and `set_scale` retain their legacy semantics.

`const copy = viewer.duplicate_model(id)` returns a new ID at the same pose, with independent appearance, transforms and metadata. Immutable geometry and matching GPU buffers are shared; memory admission remains conservative. The source reference remains unchanged for VSJ, while `display_name` identifies the copy. Copied animation definitions and phase are retained but paused; the original keeps playing.

`viewer.set_camera_view('top')` fits the scene from front/back/left/right/top/bottom/isometric using Z up and the existing perspective projection. It never rotates the models. Camera bookmarks are explicit data:

`viewer.set_camera_bookmarks([{name: 'Detail', camera: viewer.get_camera_state()}])`

Use `get_camera_bookmarks()` to obtain a defensive copy and `set_camera_state(bookmark.camera)` to restore one. Up to 32 uniquely named views (80 characters per name) are supported. They are kept in memory and in scene exports, not localStorage.

`const {area_mm2, volume_mm3, volume_valid, volume_reason} = await viewer.measure_model(id)`

Measurements use workers and support `signal`, `max_time_ms` (default 30 seconds) and `on_progress`. Area includes all triangles at current scale. Volume is nullable: detailed topology, intersections and shell-orientation checks must establish a closed volume. An open/invalid mesh or an inconclusive/time-limited check never becomes a plausible-looking volume. Results are cached by mesh and scale; position/rotation do not invalidate them and uniform resizing updates cached measurements algebraically. Nonuniform area is recalculated in the worker. Memory limits can reject the calculation before buffers are copied. This is a bounded mesh analysis, not a guarantee of printability.

VSB/VSJ retain size baselines, file-unit interpretation, display units, duplicate labels and bookmarks. VSB still embeds geometry; VSJ still needs the referenced source files. No second unit conversion occurs during import. Appending scenes merges bookmark names with numbered suffixes; a combined total above 32 rejects the incoming scene. Old files without the new optional fields continue to load. The `size_state.unit_factor` serialization field preserves source-unit correction separately from resize factors for exports with `apply_transforms:false`.

The optional app control group is listed in `src/app-tools.js` (`toolsControls`). Provide the whole group or omit it when embedding older markup. The preview's `site/index.html` is a complete example. Models contains collapsed Size & units and Duplicate; View contains collapsed Camera & saved views; Info contains area and the volume calculation. No server is involved for local files or measurements.
