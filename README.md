# Viewstl

Javascript STL/OBJ/3MF/STEP/IGES 3D files Viewer

**ViewSTL v2.00 — release candidate 2.0.0-rc.9.** A new native WebGL 2 implementation; no THREE.js runtime required. Reads local files on the user's device, with resizing, units, duplication, camera bookmarks, model exports, animation, VSB/VSJ scene saving and mesh checks.

The new plugin is in `src/` and `build/`. Previous versions remain available in [legacy/](https://github.com/omrips/viewstl/tree/main/legacy), on the unchanged [master branch](https://github.com/omrips/viewstl/tree/master), and through their existing tags. v2 has [documented compatibility differences](docs/v2-usage.md#existing-api-and-intentional-differences).

The plugin contains model/scene operations; your page supplies its own controls and dialogs. Use `StlViewer` for a viewer, or [`ViewerSession`](docs/v2-usage.md#viewer-sessions-and-custom-interfaces) for queued loading and editing. rc.8 `mountViewstlApp` users should read the [migration note](docs/v2-usage.md#migrating-from-the-rc8-app-helper).

## Usage:

Download the [v2 plugin ZIP](https://github.com/omrips/viewstl/releases/download/v2.0.0-rc.9/viewstl-2.0.0-rc.9.zip) and copy its complete `build/` folder to your website. Add to your page:

```html
<div id="stl_cont" style="height:500px"></div>
<script src="build/viewstl.min.js"></script>
<script>var stl_viewer=new StlViewer(document.getElementById("stl_cont"), {models:[{id:0, filename:"mystl.stl"}]});</script>
```

Replace `mystl.stl` with your model and serve the page over HTTP(S). Keep the worker, `chunks/` and `cad/` folders alongside the viewer. Archive/CAD dependencies are included and load only when needed; v2 does not require a separate JSZip setup.

## npm / Node.js:

```sh
npm install viewstl
```

Browser apps can import `StlViewer` from `viewstl`; see [worker setup](https://github.com/omrips/viewstl/blob/main/docs/v2-usage.md#es-modules-and-npm). Server-only analysis requires Node.js 20+:

```js
import { analyzeFile } from 'viewstl/node';
console.log(await analyzeFile('part.stl', { units: 'mm' }));
```

No version suffix is needed. `npm install @omrips/viewstl` also installs the current release; existing scoped imports remain supported. Both names contain the same plugin, including animation and VSB/VSJ scene persistence.

More at [viewstl.com/plugin](https://www.viewstl.com/plugin/). For v2, see [usage and API notes](docs/v2-usage.md), [release notes](docs/releases/2.0.0-rc.9.md) and [verification](docs/v2-verification.md).

The [original README and usage examples](https://github.com/omrips/viewstl/blob/main/legacy/v1/README.md) are preserved with the legacy plugin. ViewSTL uses the [MIT license](LICENSE); optional dependencies retain their [third-party notices](THIRD-PARTY-NOTICES.txt).
