# Native WebGL2 plugin: compatibility requirements

Status: v2 implemented; release candidate `2.0.0-rc.5`. This document records the requirements, updated for the approved main-branch layout;
see [usage and intentional differences](v2-usage.md) for the implemented
contract and [verification](v2-verification.md) for actual test coverage.

## Scope and distribution

Rebuild the plugin in the existing `omrips/viewstl` repository, retaining
the `StlViewer` constructor and the existing public method names and
parameters wherever their contract is independent of Three.js.

```js
var viewer = new StlViewer(container, {
  models: [{ id: 0, filename: "model.stl" }]
});
```

- Develop v2 on `main` after release preparation on `codex/publish-plugin-v2`.
- Keep the legacy `master` branch and existing tags unchanged. Preserve its complete tree under `legacy/v1/` on `main`.
- Put new implementation files under `src/`.
- Keep new artifacts under `build/`.
- Maintain classic script-tag usage and the global `StlViewer` entry point.
  An ES module entry point can be provided additionally.
- Existing production site, DNS and hosting remain outside this preparation.

WebGL2 is the rendering minimum. The rewrite will not include the legacy
CanvasRenderer software fallback, WebGL1 fallback, or Internet Explorer
polyfills. Initialization failure must produce a useful user-facing error
and report through the established error mechanism. Context loss and
restoration need deliberate resource handling.

## Reference versions

Use GitHub commit `fbb7f5c3894862778c3a6c5d2630573e2496d01f` as the preserved
repository baseline. Also review the dated local source snapshot in
`legacy/local-1.14-2026-09-30/`. It contains differences absent from GitHub.
The local snapshot's version comment does not prove that all its minified
artifacts are a matching v1.14 build.

The public documentation at https://www.viewstl.com/plugin/ and executable
behavior both inform the contract. When they disagree, record the decision
and preserve valid existing calls; do not silently reproduce a known bug
or invent an ambiguous overload.

## Constructor and model options

| Group | Existing options to account for |
| --- | --- |
| Model loading | `models`, `allow_drag_and_drop` |
| Layout | `width`, `height`, documented `canvas_width` / `canvas_height`, `auto_resize` |
| Background | `bg_color`, documented `bgcolor` |
| Camera | `camerax`, `cameray`, implemented `cameraz`, `camera_state`, `zoom`, `center_models` |
| Interaction | `auto_rotate`, `mouse_zoom`, `controls` (0 orbit / 1 trackball), `send_no_model_click_event` |
| Scene | Implemented `grid` option |
| Callbacks | `ready_callback`, `all_loaded_callback`, `loading_progress_callback`, `model_loaded_callback`, `load_error_callback`, `on_model_drop`, `on_model_mouseclick`, implemented `on_model_mousedown` |
| Dependency paths | `load_three_files`, `jszip_path`, `jszip_utils_path` |

Model options include `id`, `filename`, `local_file`, `mesh`, `x`, `y`, `z`,
`display`, `color`, `scale`, `scalex`, `scaley`, `scalez`, `rotationx`,
`rotationy`, `rotationz`, `opacity`, `view_edges`, `units`, and `animation`.
Retain the supported File/Blob inputs and default/automatic ID behavior.
Do not interpret `0` as an absent ID, coordinate, rotation or opacity.

Animation supports `delta` and `exact`, duration `msec`, applicable `loop`
behavior, position, rotation and scale fields. Preserve radians for
rotation and milliseconds for duration.

`load_three_files` currently also controls worker asset paths. It cannot
simply become an ignored parameter. Design an explicit mapping to the
native worker/asset directory, including the existing false/omitted cases.
Resolve URLs relative to the correct script or document base, and test
pages that embed the plugin from a different directory.

Native fetch replaces JSZipUtils. Old ZIP path parameters need a documented
compatibility policy; accepting a parameter while silently changing its
meaning is not sufficient.

## Public methods

| Area | Methods to preserve |
| --- | --- |
| Lifecycle | `add_model`, `add_models`, `remove_model`, `clean`, `dispose` |
| Appearance | `set_display`, `set_color`, `set_opacity`, `set_edges`, `set_grid`, `set_bg_color` |
| Transforms | `set_position`, `set_scale`, `rotate`, `animate_model`, `set_model_units` |
| Information | `get_model_info` |
| Camera | `set_center_models`, `set_zoom`, `set_auto_zoom`, `set_auto_rotate`, `set_mouse_zoom`, `set_auto_resize`, `get_camera_state`, `set_camera_state` |
| Interaction | `set_on_model_mouseclick`, implemented `set_on_model_mousedown`, `set_drag_and_drop` |
| STL export | `get_stl_bin`, `download_model` |
| JSON scenes | `get_vsj`, `download_vsj`, `load_vsj` |
| Packaged scenes | `get_vsb`, `get_vsb_blob`, `download_vsb`, `load_vsb` |
| Three.js boundary | `get_model_mesh` and the `mesh` model input; see below |

Compatibility includes parameter defaults, return values, missing-ID
handling, callback arguments, callback timing/order, and resource cleanup.
Do not change synchronous getters into Promises. `get_vsb_blob` already has
a Promise contract; `get_vsb` returns an ordinary object with binary data.
Additional asynchronous APIs may supplement the existing API.

## Documentation differences to resolve

| Documentation | Executable local source |
| --- | --- |
| `bgcolor` | Reads `bg_color` |
| `canvas_width`, `canvas_height` | Initialization reads `width`, `height` |
| `set_on_model_mouseclick(callback)` | Implements `set_on_model_mousedown(callback)` |
| `set_model_units(units, scale)` | Implements `set_model_units(model_id, units, scale)` |

Safe aliases should support both documented and working property/method
names. Specify precedence if both aliases are provided. The missing model
ID in the documented units method is ambiguous for a scene with multiple
models: preserve the working three-argument signature and correct the
documentation rather than guessing the target model.

## Three.js compatibility boundary

`get_model_mesh(id)` returns a cloned Three.js Mesh with cloned geometry and
material. `add_model({mesh: ...})` accepts a Three.js Mesh. Returning a plain
native object under the same method name is a breaking change.

The proposed solution is an optional adapter using a Three.js instance
provided by the embedding application, while normal STL rendering remains
independent of Three.js. Supported mesh, geometry and material types must
be explicit. Arbitrary shaders, scene hierarchies and all historical
Three.js revisions cannot be promised as automatically compatible.

Before claiming complete API compatibility, settle and test the adapter's
scope and the behavior when a mesh API is called without it. Do not add a
fake Mesh return value or silently discard unsupported material features.

The legacy website uses `get_model_mesh` plus `add_model({mesh: ...})` for
duplication. It also accesses `.models`, `.models_ref`, `.camera`,
`.controls`, and `.renderer.domElement` directly. Its camera projection,
interaction disabling, duplication and screenshot code need migration or
explicit compatibility support. Matching documented methods alone does
not make that website a drop-in replacement.

## Geometry and rendering

- Parse in workers into typed positions, normals, colors and optional
  indices, with bounds and useful metadata calculated before delivery.
- Transfer ArrayBuffer ownership instead of cloning nested arrays or
  rebuilding Three.js Vector3/Face3 objects on the main thread.
- Preserve synchronous information queries with a clear caching and
  invalidation strategy, including nonuniform scale and unit changes.
- Implement flat and smooth shading, wireframe and feature edges as
  distinct display behaviors. Defer optional derived geometry where safe.
- Preserve face colors and the precedence of a caller's color override.
- Test transparency and overlapping models, not only opaque single meshes.
- Render on demand; run frames while interaction, damping or animation
  requires them. Cancel work and release resources on removal/disposal.
- Bound concurrent parsing to avoid one unbounded worker per model.
- Test clicks against transformed geometry with sensible acceleration for
  large meshes; preserve callback IDs, distance and click-type values.

Main-thread WebGL2 with worker parsing and transferable buffers is the
initial architecture. OffscreenCanvas is optional future work, not a
prerequisite for eliminating geometry cloning.

## Formats and ZIP dependencies

The normal STL core needs no third-party runtime library. ASCII STL,
binary STL (including existing color variants), OBJ geometry and VSJ
JSON are implementable directly. Export STL using DataView and Blob.

`get_vsb` itself needs no ZIP implementation. Packaged VSB import/export
and 3MF import do need ZIP handling. Load that support only on demand;
initially prefer a maintained, pinned ZIP implementation rather than
making archive maintenance part of the STL core. JSZipUtils is unnecessary.

CompressionStream/DecompressionStream can handle compressed streams, but
do not replace ZIP entry parsing, directory records, checksums and limits.
A future dependency-free archive implementation would need all of those.

Preserve the actual VSB manifest entry name `json_data.vsj`, serialized
scene shape, IDs and geometry transformation conventions. Test old saved
files and round trips for scaling, colors, camera state and multiple models.
Specify supported 3MF components, transforms and colors; do not describe
partial legacy format support as full support for all 3MF extensions.

Local files must stay local. Remote loading still obeys browser CORS.
Validate byte lengths, finite geometry values, indices and archive limits;
report parse/network failures through callbacks without hanging a session.

## Verification before replacing any integration

1. Run representative existing examples against both the legacy plugin
   and the new implementation; compare calls, returns and event sequences.
2. Test zero values, automatic and explicit IDs, multiple loading sessions,
   errors, removal during loading, repeated `clean` and `dispose`.
3. Test real binary/ASCII/color STL, OBJ, 3MF, VSJ and VSB fixtures, including
   malformed/truncated inputs and archive expansion limits.
4. Compare rendering and controls for flat/smooth/wireframe/edges, colors,
   opacity, multiple models, units, transforms, animation and camera state.
5. Check parsing/transfer/first-frame time and memory on large models;
   verify resource cleanup and no unnecessary idle draws.
6. Test current Chromium, Firefox and Safari, plus mobile/touch behavior,
   high-DPI resizing and unavailable/lost graphics contexts.
7. Check that every pre-existing tracked legacy source, dependency and
   build file still matches the preservation baseline byte for byte.

This checklist is broader than the completed validation. In particular,
Safari, Firefox, real mobile hardware and every historical third-party
integration still require validation before a stable release.
