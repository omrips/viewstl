import {
  modelSize,
  resizeModel,
  setFileUnits,
  resetModelSize,
  duplicateModel,
  cameraView,
  validateBookmarks,
  mergeBookmarks,
  validateSizeState,
  sizeState,
  measureModel,
  validateUnits,
} from "./model-tools.js";
import {
  validateView,
  validateSection,
  viewFeatures,
  sectionPlane,
} from "./appearance.js";
import { Renderer } from "./renderer.js";
import { Controls } from "./controls.js";
import { WorkerPool } from "./worker-pool.js";
import { importScene } from "./scene-import-controller.js";
import {
  normalizeAnimation,
  normalizePlaybackState,
  createPlayback,
  evaluatePlayback,
  advancePlayback,
  playbackState,
  savePlayback,
} from "./animation.js";
import {
  checkPrintability,
  showPrintability,
  reportCurrent,
} from "./print-controller.js";
import { printSignature } from "./print-options.js";
import {
  exportOptions,
  exportMemory,
  exportFilename,
} from "./export-options.js";
import {
  limitsWith,
  colorRGB,
  exportSTL,
  scaledStats,
  intersectGeometry,
  finishGeometry,
} from "./geometry.js";
import { readSource } from "./io.js";
import {
  assertMemory,
  derivedMemory,
  geometryMemory,
  MEMORY_OVERHEAD,
} from "./memory.js";
import { fromThreeMesh, toThreeMesh } from "./three-bridge.js";
import {
  add,
  sub,
  norm,
  mul,
  modelMatrix,
  cameraMatrix,
  inverse,
  transform,
} from "./math.js";
const transformKeys = [
  "x",
  "y",
  "z",
  "rotationx",
  "rotationy",
  "rotationz",
  "scalex",
  "scaley",
  "scalez",
];
const modelKeys = [
  "id",
  "filename",
  "remote_url",
  "remote_format",
  "orig_filename",
  "local_file",
  "mesh",
  "data",
  "x",
  "y",
  "z",
  "display",
  "color",
  "scale",
  "scalex",
  "scaley",
  "scalez",
  "rotationx",
  "rotationy",
  "rotationz",
  "opacity",
  "view_edges",
  "smooth_shading",
  "section",
  "units",
  "animation",
  "animation_state",
  "size_state",
  "display_name",
];
const finite = (v, name) => {
  if (typeof v !== "number" || !Number.isFinite(v))
    throw new Error(`${name} must be a finite number`);
  return v;
};
const positive = (v, name) => {
  finite(v, name);
  if (v <= 0) throw new Error(`${name} must be positive`);
  return v;
};
const vector = (v, name) => [
  finite(v.x, `${name}.x`),
  finite(v.y, `${name}.y`),
  finite(v.z, `${name}.z`),
];
const asObject = (v) => ({ x: v[0], y: v[1], z: v[2] });
const basename = (name) =>
  String(name || "model.stl")
    .split(/[\\/]/)
    .pop()
    .split(/[?#]/)[0];
function download(blob, name) {
  const link = document.createElement("a"),
    url = URL.createObjectURL(blob);
  link.href = url;
  link.download = basename(name);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function modelOptions(input) {
  const out = {};
  for (const k of modelKeys) if (Object.hasOwn(input, k)) out[k] = input[k];
  return out;
}

export class StlViewer {
  static version = "2.0.0-rc.9";
  static workerURL = null;
  constructor(parent, options = {}) {
    if (!parent?.appendChild)
      throw new TypeError("StlViewer requires a DOM container");
    this.parent_element = parent;
    this.options = { ...options };
    this.error = null;
    this.ready = false;
    this.killsign = false;
    this.models = [];
    this.models_ref = Object.create(null);
    this.models_count = 0;
    this.max_model_id = -1;
    this.load_status = Object.create(null);
    this.load_session = 0;
    this._models = new Map();
    this._pending = new Map();
    this._jobs = new Map();
    this._derived = new Set();
    this._memoryReservations = new Map();
    this._exportBytes = 0;
    this._loadTail = Promise.resolve();
    this._sceneLoads = new Set();
    this._aborters = new Set();
    this._generation = 0;
    this._sessionActive = false;
    this._frame = 0;
    this._lastTime = 0;
    this.camera_bookmarks = [];
    this.display_units = "mm";
    this.grid = null;
    this._gridAuto = false;
    this.camera = {
      position: [0, 0, 100],
      target: [0, 0, 0],
      up: [0, 1, 0],
      near: 0.01,
      far: 10000,
    };
    this.when_ready = new Promise((resolve, reject) => {
      this._readyResolve = resolve;
      this._readyReject = reject;
    });
    this.when_ready.catch(() => {});
    for (const name of [
      "ready_callback",
      "all_loaded_callback",
      "model_loaded_callback",
      "load_error_callback",
      "loading_progress_callback",
      "on_model_drop",
      "animation_state_callback",
      "animation_complete_callback",
    ])
      this[name] = options[name] ?? null;
    this.onmousedown_callback =
      options.on_model_mousedown ?? options.on_model_mouseclick ?? null;
    queueMicrotask(() => this._initialize());
  }
  _initialize() {
    if (this.killsign) return;
    try {
      const o = this.options;
      this.limits = limitsWith(o);
      this.bg_color = o.bg_color ?? o.bgcolor ?? "transparent";
      if (this.bg_color !== "transparent") colorRGB(this.bg_color);
      if (
        o.worker_count !== undefined &&
        (!Number.isInteger(o.worker_count) ||
          o.worker_count < 1 ||
          o.worker_count > 4)
      )
        throw new Error("worker_count must be 1–4");
      if (o.worker_timeout !== undefined)
        positive(o.worker_timeout, "worker_timeout");
      if (o.pixel_ratio !== undefined) positive(o.pixel_ratio, "pixel_ratio");
      if (o.controls !== undefined && o.controls !== 0 && o.controls !== 1)
        throw new Error("controls must be 0 or 1");
      this.center_models = o.center_models ?? true;
      this.auto_resize = o.auto_resize ?? true;
      this.auto_rotate = o.auto_rotate ?? false;
      this.mouse_zoom = o.mouse_zoom ?? true;
      this.send_no_model_click_event = o.send_no_model_click_event ?? false;
      this.zoom = o.zoom ?? -1;
      this.canvas_width = o.width ?? o.canvas_width ?? "100%";
      this.canvas_height = o.height ?? o.canvas_height ?? "100%";
      this.canvas = document.createElement("canvas");
      this.canvas.style.cssText =
        "display:block;touch-action:none;outline-offset:3px;";
      this._setSizeStyle();
      this.canvas.tabIndex = 0;
      this.canvas.setAttribute(
        "aria-label",
        "3D model viewer. Drag to rotate, shift-drag to pan, scroll to zoom.",
      );
      this.parent_element.appendChild(this.canvas);
      this.renderer = new Renderer(
        this.canvas,
        () => {
          this._suspendAnimations(true);
          this._message(
            "Graphics interrupted. Waiting for the browser to restore rendering…",
          );
        },
        () => {
          this._removeMessage();
          this._suspendAnimations(this.canvas.ownerDocument.hidden);
          this._invalidate();
        },
        (e) => this._error(e),
      );
      this.controls = new Controls(
        this.canvas,
        this.camera,
        () => this._invalidate(),
        (e, type) => this._pick(e, type),
        o.controls ?? 0,
      );
      this.controls.noZoom = !this.mouse_zoom;
      let workerURL = o.worker_url ?? StlViewer.workerURL;
      if (o.worker_url === undefined && typeof o.load_three_files === "string")
        workerURL = new URL(
          "viewstl.worker.js",
          new URL(o.load_three_files || "./", document.baseURI),
        ).href;
      if (!workerURL && !o.worker_factory)
        throw new Error("Specify worker_url when using the CommonJS build");
      this._pool = new WorkerPool(workerURL, {
        count: o.worker_count ?? 2,
        timeout: o.worker_timeout ?? 120000,
        factory: o.worker_factory,
      });
      this._drop = (e) => {
        e.preventDefault();
        const files = [...e.dataTransfer.files];
        for (const file of files) {
          this._callback("on_model_drop", file.name);
          this.add_model({ local_file: file });
        }
      };
      this._drag = (e) => e.preventDefault();
      this.set_drag_and_drop(o.allow_drag_and_drop ?? true);
      this.set_auto_resize(this.auto_resize);
      this.do_resize();
      this.camera.position = [
        o.camerax ?? 0,
        o.cameray ?? 0,
        this.zoom >= 0 ? Math.max(this.zoom, 1e-6) : (o.cameraz ?? 100),
      ];
      if (o.camera_state) {
        this.set_camera_state(o.camera_state);
        this._restoreCamera = o.camera_state;
      }
      if (o.grid) this.set_grid(true);
      this._key = (e) => {
        if (!this.controls.enabled) return;
        const actions = {
          ArrowLeft: () => this.controls.orbit(-0.12, 0),
          ArrowRight: () => this.controls.orbit(0.12, 0),
          ArrowUp: () => this.controls.orbit(0, -0.12),
          ArrowDown: () => this.controls.orbit(0, 0.12),
          "+": () => this.controls.zoom(0.9),
          "-": () => this.controls.zoom(1.1),
          f: () => this.set_auto_zoom(),
        };
        if (actions[e.key]) {
          e.preventDefault();
          actions[e.key]();
        }
      };
      this.canvas.addEventListener("keydown", this._key);
      this._visibility = () =>
        this._suspendAnimations(
          this.canvas.ownerDocument.hidden || this.renderer.lost,
        );
      this.canvas.ownerDocument.addEventListener(
        "visibilitychange",
        this._visibility,
      );
      this._animationSuspended = this.canvas.ownerDocument.hidden;
      this.ready = true;
      this._readyResolve(this);
      this._callback("ready_callback");
      if (o.models) this.add_models(o.models);
      this._invalidate();
    } catch (error) {
      this.ready = false;
      this._readyReject(error);
      this._error(error);
      this._message(error.message);
      this._pool?.dispose();
      this.controls?.dispose();
      this.renderer?.dispose();
      this._resizeObserver?.disconnect();
      if (this._visibility)
        this.canvas.ownerDocument.removeEventListener(
          "visibilitychange",
          this._visibility,
        );
    }
  }
  _callback(name, ...args) {
    const fn = this[name];
    if (typeof fn === "function")
      try {
        fn(...args);
      } catch (error) {
        console.error(`ViewSTL ${name} callback failed`, error);
      }
  }
  _error(error) {
    this.error = error?.message ?? String(error);
    this._callback("load_error_callback", this.error);
    return null;
  }
  _message(text) {
    this._removeMessage();
    this._messageElement = document.createElement("p");
    this._messageElement.setAttribute("role", "status");
    this._messageElement.textContent = text;
    this.parent_element.appendChild(this._messageElement);
  }
  _removeMessage() {
    this._messageElement?.remove();
    this._messageElement = null;
  }
  _setSizeStyle() {
    this.canvas.style.width =
      typeof this.canvas_width === "number"
        ? `${this.canvas_width}px`
        : this.canvas_width;
    this.canvas.style.height =
      typeof this.canvas_height === "number"
        ? `${this.canvas_height}px`
        : this.canvas_height;
  }
  _guard(fn) {
    if (this.killsign) return null;
    try {
      return fn();
    } catch (error) {
      return this._error(error);
    }
  }
  _model(id) {
    const model = this._models.get(Number(id));
    if (!model) throw new Error(`Model id not found: ${id}`);
    return model;
  }
  _invalidate() {
    const diagnostic = this.renderer?.diagnostic;
    if (diagnostic && printSignature(diagnostic.model) !== diagnostic.signature)
      this.renderer.setDiagnostic(null);
    if (
      this.killsign ||
      !this.renderer ||
      this.renderer.lost ||
      this._frame ||
      this._animationSuspended
    )
      return;
    this._frame = requestAnimationFrame((t) => {
      this._frame = 0;
      this._render(t);
    });
  }
  _render(time) {
    const elapsed = this._lastTime
      ? Math.min((time - this._lastTime) / 1000, 0.1)
      : 0;
    this._lastTime = time;
    let animated = false;
    for (const m of this._models.values())
      if (
        m.geometry &&
        !m._sceneImportPending &&
        m._animation &&
        !m._animation.paused
      ) {
        this._animate(m, time);
        animated ||= !!m._animation && !m._animation.paused;
      }
    if (this.auto_rotate && this.controls.enabled)
      this.controls.orbit(elapsed * 0.3, 0);
    const diagnostic = this.renderer.diagnostic;
    if (diagnostic && printSignature(diagnostic.model) !== diagnostic.signature)
      this.renderer.setDiagnostic(null);
    this._clip();
    try {
      this.renderer.draw(
        [...this._models.values()].filter((m) => !m._sceneImportPending),
        this.camera,
        this.bg_color,
      );
    } catch (error) {
      this.renderer.clear();
      this._error(error);
      return;
    }
    if (animated || (this.auto_rotate && this.controls.enabled))
      this._invalidate();
    else this._lastTime = 0;
  }
  _bounds() {
    const min = [Infinity, Infinity, Infinity],
      max = [-Infinity, -Infinity, -Infinity];
    let count = 0;
    for (const model of this._models.values())
      if (model.geometry && !model._sceneImportPending) {
        count++;
        const { bounds } = model.geometry,
          matrix = modelMatrix(model);
        for (let corner = 0; corner < 8; corner++) {
          const v = transform(
            matrix,
            [0, 1, 2].map((i) => bounds[corner & (1 << i) ? "max" : "min"][i]),
          );
          for (let i = 0; i < 3; i++) {
            min[i] = Math.min(min[i], v[i]);
            max[i] = Math.max(max[i], v[i]);
          }
        }
      }
    return count
      ? {
          min,
          max,
          center: min.map((v, i) => (v + max[i]) / 2),
          radius: Math.max(Math.hypot(...sub(max, min)) / 2, 1e-6),
        }
      : null;
  }
  _clip() {
    const b = this._bounds(),
      distance = Math.hypot(
        ...sub(this.camera.position, b?.center ?? this.camera.target),
      ),
      r = b?.radius ?? 10;
    this.camera.near = Math.max(
      1e-6,
      Math.min(r * 0.001, Math.max(distance - r, 1e-6) * 0.1),
    );
    this.camera.far = Math.max(this.camera.near * 100, distance + r * 4, 100);
  }
  _progress(id, value) {
    if (!this._models.has(id) || this.killsign) return;
    this.load_status[id] = value;
    this._callback(
      "loading_progress_callback",
      this.load_status,
      this.load_session,
    );
  }
  add_models(models) {
    return this._guard(() => {
      if (!Array.isArray(models)) throw new Error("models must be an array");
      for (const model of models) this.add_model(model);
    });
  }
  add_model(input) {
    return this._guard(() => {
      if (!input || typeof input !== "object") throw new Error("Invalid model");
      const supplied = modelOptions(input),
        name = supplied.filename ?? supplied.local_file?.name ?? "model.stl";
      if (/\.vsj(?:[?#]|$)/i.test(name))
        return this.load_vsj(supplied.local_file ?? name);
      if (/\.vsb(?:[?#]|$)/i.test(name))
        return this.load_vsb(supplied.local_file ?? name);
      const id =
        supplied.id === undefined || supplied.id === -1
          ? this.max_model_id + 1
          : supplied.id;
      if (!Number.isSafeInteger(id) || id < 0 || this._models.has(id))
        throw new Error(`Invalid or duplicate model id: ${id}`);
      const m = {
        ...supplied,
        id,
        filename: supplied.filename ?? supplied.local_file?.name ?? "",
        x: 0,
        y: 0,
        z: 0,
        rotationx: 0,
        rotationy: 0,
        rotationz: 0,
        scalex: 1,
        scaley: 1,
        scalez: 1,
        opacity: 1,
        units: "mm",
        display: "flat",
        view_edges: false,
        color: null,
        unitScale: 1,
        center: [0, 0, 0],
        geometry: null,
      };
      for (const key of transformKeys)
        m[key] =
          supplied[key] ??
          (key.startsWith("scale") ? (supplied.scale ?? 1) : 0);
      for (const key of transformKeys) {
        finite(m[key], key);
        if (key.startsWith("scale")) positive(m[key], key);
      }
      if (supplied.size_state)
        m.size_state = validateSizeState(supplied.size_state);
      if (supplied.display_name != null) {
        if (
          typeof supplied.display_name !== "string" ||
          supplied.display_name.length > 1024
        )
          throw new Error("Invalid model name");
        m.display_name = supplied.display_name;
      }
      m.opacity = supplied.opacity ?? supplied.mesh?.material?.opacity ?? 1;
      finite(m.opacity, "opacity");
      if (m.opacity < 0 || m.opacity > 1)
        throw new Error("Opacity must be between 0 and 1");
      m.display = supplied.display ?? "flat";
      Object.assign(
        m,
        validateView(
          m.display,
          supplied.smooth_shading ?? m.display === "smooth",
        ),
      );
      m.section = validateSection(supplied.section);
      m.units = supplied.units ?? "mm";
      if (!["mm", "inch"].includes(m.units)) throw new Error("Invalid units");
      m.color =
        supplied.color ??
        (supplied.mesh?.material?.color?.getHexString
          ? "#" + supplied.mesh.material.color.getHexString()
          : null);
      if (m.color && m.color !== "transparent") colorRGB(m.color);
      m.view_edges = !!supplied.view_edges;
      m.animation =
        supplied.animation == null
          ? null
          : normalizeAnimation(supplied.animation);
      m.animation_state =
        supplied.animation_state == null
          ? null
          : normalizePlaybackState(supplied.animation_state);
      if (m.animation_state && !m.animation)
        throw new Error("Playback state needs an animation");
      if (m.animation) createPlayback(m.animation, m, m.animation_state);
      Object.defineProperty(m, "scaleVector", {
        get: () => [
          m.scalex * m.unitScale,
          m.scaley * m.unitScale,
          m.scalez * m.unitScale,
        ],
      });
      this.max_model_id = Math.max(id, this.max_model_id);
      this._models.set(id, m);
      this.models_ref[id] = this.models.length;
      this.models.push(m);
      this.models_count = this._models.size;
      this._sessionActive = true;
      this.load_status[id] = { loaded: 0, total: 0 };
      const generation = this._generation;
      const work = this._loadModel(m, supplied, generation)
        .then(() => {
          if (generation !== this._generation || this._models.get(id) !== m)
            return;
          this._pending.delete(id);
          this._finishSession();
          this._callback("model_loaded_callback", id);
        })
        .catch((error) => {
          if (generation === this._generation && this._models.get(id) === m) {
            this._pending.delete(id);
            this._deleteModel(m);
            if (error.name !== "AbortError") this._error(error);
            this._finishSession();
          }
        })
        .finally(() => {
          this._jobs.delete(m);
        });
      this._pending.set(id, work);
      return undefined;
    });
  }
  _occupiedMemory(except) {
    let bytes =
      (this._exportBytes || 0) +
      (this._sceneBytes || 0) +
      (this._printBytes || 0) +
      (this._printCache ? 4 * 1024 ** 2 : 0);
    for (const m of this._models.values())
      if (m !== except) {
        const reservations = this._memoryReservations?.get(m);
        bytes += Math.max(
          geometryMemory(m.geometry),
          [...(reservations?.values() || [])].reduce(
            (sum, r) => sum + r.bytes,
            0,
          ),
        );
      }
    return bytes;
  }
  _reserveMemory(m, bytes, kind = "derive") {
    this._memoryReservations ??= new Map();
    let reservations = this._memoryReservations.get(m);
    if (!reservations)
      this._memoryReservations.set(m, (reservations = new Map()));
    const key = {};
    reservations.set(key, { bytes, kind });
    return () => {
      reservations.delete(key);
      if (
        !reservations.size &&
        this._memoryReservations.get(m) === reservations
      )
        this._memoryReservations.delete(m);
    };
  }
  async _loadModel(m, supplied, generation) {
    // A finite scene budget serializes parsing so each worker gets the true remaining allowance.
    let release = () => {};
    if (this.options.max_memory_bytes !== undefined) {
      const previous = this._loadTail;
      this._loadTail = new Promise((resolve) => {
        release = resolve;
      });
      await previous;
    }
    try {
      await this._readModel(m, supplied, generation);
    } finally {
      release();
    }
  }
  async _readModel(m, supplied, generation) {
    await this.when_ready;
    if (
      this.killsign ||
      generation !== this._generation ||
      this._models.get(m.id) !== m
    )
      return;
    const available = Math.max(
      1,
      this.limits.max_memory_bytes - this._occupiedMemory(m),
    );
    const limits = { ...this.limits, max_memory_bytes: available };
    assertMemory(limits, MEMORY_OVERHEAD, "scene");
    const releaseMemory =
      this.limits.max_memory_bytes < Number.MAX_SAFE_INTEGER
        ? this._reserveMemory(m, available - MEMORY_OVERHEAD, "parse")
        : () => {};
    try {
      const features = viewFeatures(m);
      if (supplied.mesh) m.geometry = fromThreeMesh(supplied.mesh, limits);
      else if (supplied.data)
        m.geometry = finishGeometry(
          new Float32Array(supplied.data.positions),
          supplied.data.colors ? new Float32Array(supplied.data.colors) : null,
          limits,
        );
      else {
        const source =
          supplied.local_file ?? supplied.filename ?? supplied.remote_url;
        if (!source)
          throw new Error("A filename, local_file or mesh is required");
        let relay;
        if (supplied.remote_url) {
          const url = new URL(supplied.remote_url);
          if (
            !["https:", "http:"].includes(url.protocol) ||
            url.username ||
            url.password
          )
            throw new Error(
              "Use a public HTTP or HTTPS file URL without login credentials.",
            );
          if (!this.options.url_import_endpoint)
            throw new Error(
              "Configure url_import_endpoint to import remote URLs through a relay.",
            );
          relay = new URL(this.options.url_import_endpoint, document.baseURI)
            .href;
          if (new URL(relay).origin !== location.origin)
            throw new Error(
              "The URL relay must use the same origin as this page.",
            );
        }
        const task = this._pool.run(
          {
            kind: "parse",
            remote: supplied.remote_url,
            format: supplied.remote_format,
            relay,
            source:
              typeof source === "string"
                ? new URL(source, document.baseURI).href
                : source,
            name: m.display_name || m.filename,
            limits,
            features:
              features.smooth || features.edges || features.wire
                ? features
                : null,
          },
          (p) => this._progress(m.id, p),
        );
        this._jobs.set(m, task);
        m.geometry = await task;
        if (supplied.remote_url) {
          m.filename = m.geometry.source_name;
          delete m.remote_url;
          delete m.remote_format;
        }
      }
      if (
        this.killsign ||
        generation !== this._generation ||
        this._models.get(m.id) !== m
      ) {
        m.geometry = null;
        return;
      }
      if (this.center_models)
        m.center = m.geometry.bounds.min.map(
          (v, i) => (v + m.geometry.bounds.max[i]) / 2,
        );
      if (
        (supplied.mesh || supplied.data) &&
        (features.smooth || features.edges || features.wire)
      )
        await this._derive(m, features);
      if (m.animation_state) m.center = [...m.animation_state.center];
      if (m.animation && !m._animation)
        this._startAnimation(m, m.animation, m.animation_state);
      delete m.animation_state;
      delete m.mesh;
      delete m.data;
      this._invalidate();
    } finally {
      releaseMemory();
    }
  }
  _finishSession() {
    if (
      this.killsign ||
      this._pending.size ||
      this._sceneLoads.size ||
      !this._sessionActive
    )
      return;
    this._sessionActive = false;
    if (this._restoreCamera) {
      this.set_camera_state(this._restoreCamera);
      this._restoreCamera = null;
    } else if (this.zoom === -1) this.set_auto_zoom();
    if (this._gridAuto) this.set_grid(true);
    this.load_session++;
    this._callback("all_loaded_callback");
    this._invalidate();
  }
  _deleteModel(m) {
    this._stopAnimation(m, "removed");
    for (const controller of m._measureJobs || []) controller.abort();
    for (const [controller, models] of this._printJobs || [])
      if (models.has(m)) controller.abort();
    this._printCache = null;
    if (this.renderer?.selection === m) this.renderer.setSelection(null);
    this.renderer?.remove(m);
    this._jobs.get(m)?.cancel?.();
    for (const job of m._deriveJobs || []) job.cancel?.();
    this._models.delete(m.id);
    this._memoryReservations.delete(m);
    this.models[this.models_ref[m.id]] = null;
    delete this.models_ref[m.id];
    delete this.load_status[m.id];
    this.models_count = this._models.size;
    this._invalidate();
  }
  remove_model(id) {
    return this._guard(() => {
      const m = this._model(id);
      this._deleteModel(m);
      this._pending.delete(m.id);
      this._finishSession();
    });
  }
  clean() {
    if (this.killsign) return;
    this._generation++;
    this._printCache = null;
    this.camera_bookmarks = [];
    this.display_units = "mm";
    this._pool?.clear();
    for (const c of this._aborters) c.abort();
    this._aborters.clear();
    for (const m of this._models.values()) this._stopAnimation(m, "clean");
    this._models.clear();
    this._pending.clear();
    this._jobs.clear();
    this._derived.clear();
    this._memoryReservations.clear();
    this._sceneLoads.clear();
    this.models = [];
    this.models_ref = Object.create(null);
    this.models_count = 0;
    this.max_model_id = -1;
    this.load_status = Object.create(null);
    this._sessionActive = false;
    this.renderer?.clear();
    this._restoreCamera = null;
    this._invalidate();
  }
  dispose() {
    if (this.killsign) return;
    this.clean();
    this.killsign = true;
    this.ready = false;
    this._readyReject(new Error("Viewer disposed"));
    cancelAnimationFrame(this._frame);
    this._frame = 0;
    this._pool?.dispose();
    this.controls?.dispose();
    this._resizeObserver?.disconnect();
    if (this._windowResize)
      window.removeEventListener("resize", this._windowResize);
    this.renderer?.dispose();
    if (this.canvas) {
      if (this._visibility)
        this.canvas.ownerDocument.removeEventListener(
          "visibilitychange",
          this._visibility,
        );
      this.canvas.removeEventListener("drop", this._drop);
      this.canvas.removeEventListener("dragover", this._drag);
      this.canvas.removeEventListener("keydown", this._key);
      this.canvas.remove();
    }
    this._removeMessage();
    for (const key of Object.keys(this))
      if (key.endsWith("_callback")) this[key] = null;
    this.options = {};
  }
  async when_idle() {
    await this.when_ready;
    while (this._pending.size || this._sceneLoads.size || this._derived.size)
      await Promise.allSettled([
        ...this._pending.values(),
        ...this._sceneLoads,
        ...this._derived,
      ]);
    return this;
  }
  _derive(m, features) {
    const occupied =
      this._occupiedMemory(m) +
      [...(this._memoryReservations?.get(m)?.values() || [])]
        .filter((r) => r.kind === "derive")
        .reduce((sum, r) => sum + r.bytes, 0);
    const working = derivedMemory(m.geometry.triangles, {
      ...features,
      smooth: features.smooth || !!m.geometry.smoothNormals,
      edges: features.edges || !!m.geometry.edges,
      wire: features.wire || !!m.geometry.wire,
    });
    assertMemory(this.limits, occupied + working, "view mode");
    const releaseMemory = this._reserveMemory(m, working - MEMORY_OVERHEAD);
    const generation = this._generation,
      revision = (m._deriveRevision = (m._deriveRevision || 0) + 1);
    let job;
    try {
      const positions = m.geometry.positions.slice();
      job = this._pool.run(
        {
          kind: "derive",
          positions,
          features,
          limits: {
            ...this.limits,
            max_memory_bytes: this.limits.max_memory_bytes - occupied,
          },
        },
        null,
        [positions.buffer],
      );
    } catch (error) {
      releaseMemory();
      throw error;
    }
    (m._deriveJobs ??= new Set()).add(job);
    const promise = job
      .then((result) => {
        if (
          !this.killsign &&
          generation === this._generation &&
          revision === m._deriveRevision &&
          this._models.get(m.id) === m
        ) {
          Object.assign(m.geometry, result);
          this.renderer.remove(m);
          this._invalidate();
          return true;
        }
        return false;
      })
      .catch((e) => {
        if (e.name !== "AbortError" && generation === this._generation)
          this._error(e);
      })
      .finally(() => {
        releaseMemory();
        m._deriveJobs.delete(job);
        this._derived.delete(promise);
      });
    this._derived.add(promise);
    return promise;
  }
  set_view(id, options) {
    return this._guard(() => {
      const m = this._model(id),
        previous = m._requestedView || m;
      const next = validateView(
        options.display ?? previous.display,
        options.smooth_shading ?? previous.smooth_shading,
      );
      const features = viewFeatures({ ...m, ...next }),
        g = m.geometry;
      const needed =
        g &&
        ((features.smooth && !g.smoothNormals) ||
          (features.wire && !g.wire) ||
          (features.edges && (!g.edges || g.edgeAngle !== features.edgeAngle)));
      // Budget checks run synchronously before copying input or changing the visible view.
      const work = needed ? this._derive(m, features) : null;
      const revision = (m._viewRevision || 0) + 1;
      m._viewRevision = revision;
      m._requestedView = next;
      const commit = (ok) => {
        if (this._models.get(id) !== m || m._viewRevision !== revision) return;
        if (ok) Object.assign(m, next);
        delete m._requestedView;
        this._invalidate();
      };
      if (!work) commit(true);
      else {
        const task = work
          .then(commit)
          .finally(() => this._derived.delete(task));
        this._derived.add(task);
      }
    });
  }
  set_display(id, display) {
    return this.set_view(id, {
      display,
      ...(display === "flat" || display === "smooth"
        ? { smooth_shading: display === "smooth" }
        : {}),
    });
  }
  set_smooth(id, enabled) {
    return this._guard(() => {
      const m = this._model(id),
        view = m._requestedView || m;
      return this.set_view(id, {
        display: view.display === "smooth" ? "flat" : view.display,
        smooth_shading: enabled,
      });
    });
  }
  set_section(id, section) {
    return this._guard(() => {
      this._model(id).section = validateSection(section);
      this._invalidate();
    });
  }
  set_color(id, color) {
    return this._guard(() => {
      if (color !== null && color !== "transparent") colorRGB(color);
      const m = this._model(id);
      m.color = color;
      this._invalidate();
    });
  }
  set_opacity(id, opacity) {
    return this._guard(() => {
      finite(opacity, "opacity");
      if (opacity < 0 || opacity > 1)
        throw new Error("Opacity must be between 0 and 1");
      this._model(id).opacity = opacity;
      this._invalidate();
    });
  }
  set_position(id, x, y, z) {
    return this._guard(() => {
      const m = this._model(id);
      [x, y, z].forEach((v) => {
        if (v !== undefined) finite(v, "position");
      });
      this._stopAnimation(m, "manual");
      [x, y, z].forEach((v, i) => {
        if (v !== undefined) m[["x", "y", "z"][i]] = finite(v, "position");
      });
      this._invalidate();
    });
  }
  set_scale(id, x, y = x, z = x, keepPrevious = false) {
    return this._guard(() => {
      const m = this._model(id);
      [x, y, z].forEach((v) => positive(v, "scale"));
      if (keepPrevious) {
        if (x / m.scalex !== y / m.scaley || x / m.scalex !== z / m.scalez)
          throw new Error("keep_prev_scale requires a uniform geometry factor");
        this._stopAnimation(m, "manual");
        m.unitScale *= x / m.scalex;
      } else {
        this._stopAnimation(m, "manual");
        [m.scalex, m.scaley, m.scalez] = [x, y, z];
      }
      m._stats = null;
      this._invalidate();
    });
  }
  set_selection(id) {
    return this._guard(() => {
      this.renderer?.setSelection(id === null ? null : this._model(id));
      this._invalidate();
    });
  }
  set_rotation(id, x, y, z, increment = false) {
    return this._guard(() => {
      const m = this._model(id);
      [x, y, z].forEach((v) => {
        if (v !== undefined) finite(v, "rotation");
      });
      this._stopAnimation(m, "manual");
      [x, y, z].forEach((v, i) => {
        const k = ["rotationx", "rotationy", "rotationz"][i];
        if (v !== undefined)
          m[k] = finite(v, "rotation") + (increment ? m[k] : 0);
      });
      this._invalidate();
    });
  }
  rotate(id, x, y, z) {
    return this.set_rotation(id, x, y, z, true);
  }
  set_edges(id, b) {
    return this._guard(() => {
      const m = this._model(id);
      m.view_edges = !!b;
      if (b && m.geometry && !m.geometry.edges)
        this._derive(m, { edges: true });
      this._invalidate();
    });
  }
  set_grid(b, size, divisions = 10) {
    return this._guard(() => {
      this._gridAuto = !!b && size === undefined;
      if (!b) {
        this.grid = null;
        this.renderer?.setGrid(null);
      } else {
        const extent = this._bounds();
        size ??= extent
          ? Math.max(...sub(extent.max, extent.min)) * 1.2 || 10
          : 10;
        positive(size, "grid size");
        if (!Number.isInteger(divisions) || divisions < 1 || divisions > 1000)
          throw new Error("Grid divisions must be 1–1000");
        this.grid = { size, divisions };
        this.renderer?.setGrid(this.grid);
      }
      this._invalidate();
    });
  }
  set_infinite_grid(enabled, spacing = 1, height = 0) {
    return this._guard(() => {
      positive(spacing, "grid spacing");
      finite(height, "grid height");
      this._gridAuto = false;
      this.grid = enabled ? { infinite: true, spacing, height } : null;
      this.renderer?.setGrid(this.grid);
      this._invalidate();
    });
  }
  set_model_units(id, units, scale = false) {
    return this._guard(() => {
      if (!["mm", "inch"].includes(units))
        throw new Error("Units must be mm or inch");
      const m = this._model(id);
      this._stopAnimation(m, "manual");
      if (scale && m.units !== units)
        m.unitScale *= units === "inch" ? 25.4 : 1 / 25.4;
      m.units = units;
      m._stats = null;
      this._invalidate();
    });
  }
  set_bg_color(color) {
    return this._guard(() => {
      if (color !== "transparent") colorRGB(color);
      this.bg_color = color;
      this._invalidate();
    });
  }
  set_center_models(b) {
    this.center_models = !!b;
  }
  set_zoom(value = -1) {
    return this._guard(() => {
      finite(value, "zoom");
      if (value === -1) {
        this.zoom = -1;
        this.set_auto_zoom();
      } else {
        if (value < 0) throw new Error("Zoom must be non-negative or -1");
        this.zoom = value;
        this.camera.position[2] = Math.max(value, 1e-6);
        this._invalidate();
      }
    });
  }
  set_auto_zoom() {
    const b = this._bounds();
    if (!b) return;
    this.zoom = -1;
    const aspect =
      (this.canvas?.clientWidth || 1) / (this.canvas?.clientHeight || 1);
    const half = Math.min(
      Math.PI / 8,
      Math.atan(Math.tan(Math.PI / 8) * aspect),
    );
    const direction = norm(sub(this.camera.position, this.camera.target));
    this.camera.target = b.center;
    this.camera.position = add(
      b.center,
      mul(
        Math.hypot(...direction) ? direction : [0, 0, 1],
        (b.radius / Math.sin(half)) * 1.08,
      ),
    );
    this._invalidate();
  }
  set_auto_rotate(b) {
    this.auto_rotate = !!b;
    this._invalidate();
  }
  set_mouse_zoom(b) {
    this.mouse_zoom = !!b;
    if (this.controls) this.controls.noZoom = !b;
  }
  set_auto_resize(b) {
    this.auto_resize = !!b;
    this._resizeObserver?.disconnect();
    if (this._windowResize)
      window.removeEventListener("resize", this._windowResize);
    if (!b || !this.canvas) return;
    if (typeof ResizeObserver !== "undefined") {
      this._resizeObserver = new ResizeObserver(() => this.do_resize());
      this._resizeObserver.observe(this.parent_element);
    }
    this._windowResize = () => this.do_resize();
    window.addEventListener("resize", this._windowResize);
  }
  do_resize() {
    if (!this.renderer || this.killsign) return;
    const rect = this.canvas.getBoundingClientRect();
    this.renderer.resize(
      rect.width || this.parent_element.clientWidth || 300,
      rect.height || this.parent_element.clientHeight || 150,
      this.options.pixel_ratio ?? Math.min(globalThis.devicePixelRatio || 1, 2),
    );
    this._invalidate();
  }
  set_on_model_mousedown(callback) {
    this.onmousedown_callback = callback;
  }
  set_on_model_mouseclick(callback) {
    this.set_on_model_mousedown(callback);
  }
  set_drag_and_drop(b) {
    this.allow_drag_and_drop = !!b;
    if (!this.canvas) return;
    this.canvas.removeEventListener("drop", this._drop);
    this.canvas.removeEventListener("dragover", this._drag);
    if (b) {
      this.canvas.addEventListener("drop", this._drop);
      this.canvas.addEventListener("dragover", this._drag);
    }
  }
  get_camera_state() {
    return {
      position: asObject(this.camera.position),
      up: asObject(this.camera.up),
      target: asObject(this.camera.target),
    };
  }
  set_camera_state(state) {
    return this._guard(() => {
      const position = state.position
          ? vector(state.position, "position")
          : this.camera.position,
        up = state.up ? vector(state.up, "up") : this.camera.up,
        target = state.target
          ? vector(state.target, "target")
          : this.camera.target;
      if (!Math.hypot(...up) || !Math.hypot(...sub(position, target)))
        throw new Error("Degenerate camera state");
      this.camera.position = position;
      this.camera.up = norm(up);
      this.camera.target = target;
      this._invalidate();
    });
  }
  set_camera(x, y, z) {
    return this.set_camera_state({
      position: {
        x: x ?? this.camera.position[0],
        y: y ?? this.camera.position[1],
        z: z ?? this.camera.position[2],
      },
    });
  }
  pick_model(clientX, clientY) {
    if (
      !this.ready ||
      this.killsign ||
      !Number.isFinite(clientX) ||
      !Number.isFinite(clientY)
    )
      return null;
    const rect = this.canvas.getBoundingClientRect();
    if (
      !rect.width ||
      !rect.height ||
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    )
      return null;
    const vpInv = inverse(cameraMatrix(this.camera, rect.width / rect.height));
    const far = transform(vpInv, [
      ((clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((clientY - rect.top) / rect.height) * 2,
      1,
    ]);
    const direction = norm(sub(far, this.camera.position));
    let id = null,
      distance = Infinity;
    for (const m of this._models.values())
      if (m.geometry && m.opacity > 0 && m.color !== "transparent") {
        const inv = inverse(modelMatrix(m));
        const t = intersectGeometry(
          m.geometry,
          transform(inv, this.camera.position),
          transform(inv, direction, 0),
          sectionPlane(m.geometry.bounds, m.section),
        );
        if (t < distance) {
          distance = t;
          id = m.id;
        }
      }
    return id === null ? null : { id, distance };
  }
  _pick(event, type) {
    if (!this.onmousedown_callback) return;
    const hit = this.pick_model(event.clientX, event.clientY);
    if (hit || this.send_no_model_click_event)
      this._callback(
        "onmousedown_callback",
        hit?.id ?? null,
        event,
        hit?.distance ?? 0,
        type,
      );
  }
  get_model_size(id) {
    return modelSize(this._model(id));
  }
  resize_model(id, factors) {
    return resizeModel.call(this, id, factors);
  }
  set_file_units(id, units) {
    return setFileUnits.call(this, id, units);
  }
  reset_model_size(id) {
    return resetModelSize.call(this, id);
  }
  duplicate_model(id) {
    return duplicateModel.call(this, id);
  }
  set_camera_view(name) {
    return cameraView.call(this, name);
  }
  set_display_units(units) {
    this.display_units = validateUnits(units);
  }
  get_camera_bookmarks() {
    return structuredClone(this.camera_bookmarks || []);
  }
  set_camera_bookmarks(bookmarks) {
    this.camera_bookmarks = validateBookmarks(bookmarks);
  }
  measure_model(id, options) {
    return measureModel.call(this, id, options);
  }
  get_model_info(id, options = {}) {
    return this._guard(() => {
      const m = this._model(id),
        g = m.geometry;
      if (!g) return null;
      const s = m.scaleVector,
        key = s.join(",");
      if (options.measurements !== false && (!m._stats || m._stats.key !== key))
        m._stats = { key, ...scaledStats(g, s) };
      const factor = m.units === "inch" ? 1 / 25.4 : 1;
      return {
        name: m.filename,
        orig_filename: m.orig_filename ?? null,
        position: { x: m.x, y: m.y, z: m.z },
        dims: asObject(
          g.bounds.min.map((v, i) => (g.bounds.max[i] - v) * s[i]),
        ),
        rotation: { x: m.rotationx, y: m.rotationy, z: m.rotationz },
        display: m.display,
        smooth_shading: m.smooth_shading,
        section: m.section ? { ...m.section } : null,
        color: m.color ?? (g.colors ? "#ffffff" : "#909090"),
        scale: { x: m.scalex, y: m.scaley, z: m.scalez },
        volume:
          options.measurements === false ? null : m._stats.volume * factor ** 3,
        area:
          options.measurements === false ? null : m._stats.area * factor ** 2,
        triangles: g.triangles,
        bounds: { min: [...g.bounds.min], max: [...g.bounds.max] },
        has_colors: !!g.colors,
        source_units: g.units || null,
        units: m.units,
        opacity: m.opacity,
        file_bytes: g.file_bytes ?? null,
      };
    });
  }
  get_model_data(id) {
    return this._guard(() => {
      const m = this._model(id);
      if (!m.geometry) return null;
      return {
        positions: m.geometry.positions.slice(),
        colors: m.geometry.colors?.slice() ?? null,
      };
    });
  }
  get_model_mesh(id) {
    return this._guard(() => {
      const m = this._model(id);
      return m.geometry
        ? toThreeMesh(m, this.options.three ?? globalThis.THREE)
        : null;
    });
  }
  get_stl_bin(id) {
    return this._guard(() => {
      const m = this._model(id);
      return m.geometry ? exportSTL(m.geometry, m.scaleVector, m.center) : null;
    });
  }
  check_printability(options = {}) {
    return checkPrintability.call(this, options);
  }
  is_printability_current(report) {
    return reportCurrent(this, report);
  }
  show_printability(report, options) {
    return showPrintability.call(this, report, options);
  }
  clear_printability() {
    this.renderer?.setDiagnostic(null);
    this._invalidate();
  }
  async export_models(options = {}) {
    const settings = exportOptions(options),
      signal = options.signal;
    const abort = () => {
      throw new DOMException("Export cancelled", "AbortError");
    };
    if (signal?.aborted) abort();
    await this.when_ready;
    if (signal?.aborted) abort();
    if (this.killsign) throw new Error("Viewer disposed");
    let ids = options.model_ids;
    if (ids === "selected") {
      const selected = this.renderer?.selection;
      ids = selected ? [selected.id] : [];
    } else if (ids === undefined) ids = [...this._models.keys()];
    if (
      !Array.isArray(ids) ||
      ids.some((id) => !Number.isSafeInteger(id)) ||
      new Set(ids).size !== ids.length
    )
      throw new Error(
        "model_ids must be an array of unique model IDs or 'selected'",
      );
    if (!ids.length) throw new Error("No models to export");
    const models = ids.map((id) => {
      const m = this._model(id);
      if (!m.geometry) throw new Error(`Model ${id} has not finished loading`);
      return m;
    });
    const triangles = models.reduce((sum, m) => sum + m.geometry.triangles, 0);
    if (triangles > this.limits.max_triangles)
      throw new Error("Export triangle limit exceeded");
    const working = exportMemory(models, settings),
      occupied = this._occupiedMemory();
    assertMemory(this.limits, occupied + working, "export");
    this._exportBytes = (this._exportBytes || 0) + working;
    let job, cancel, callbackError;
    try {
      const snapshot = models.map((m) => {
        const source = settings.apply_transforms
          ? m
          : {
              ...m,
              center: [0, 0, 0],
              x: 0,
              y: 0,
              z: 0,
              rotationx: 0,
              rotationy: 0,
              rotationz: 0,
              scaleVector: [1, 1, 1].map(
                () => m.unitScale * (m.size_state?.unit_factor ?? 1),
              ),
            };
        const matrix = modelMatrix(source),
          factor = settings.units === "inch" ? 1 / 25.4 : 1;
        for (let c = 0; c < 4; c++)
          for (let r = 0; r < 3; r++) matrix[c * 4 + r] *= factor;
        return {
          id: m.id,
          name: basename(m.filename),
          matrix,
          positions: m.geometry.positions.slice(),
          colors: settings.colors ? m.geometry.colors?.slice() : null,
          color:
            settings.colors && m.color && m.color !== "transparent"
              ? colorRGB(m.color)
              : null,
          opacity: m.color === "transparent" ? 0 : m.opacity,
        };
      });
      const transfer = snapshot.flatMap((m) => [
        m.positions.buffer,
        ...(m.colors ? [m.colors.buffer] : []),
      ]);
      job = this._pool.run(
        {
          kind: "export",
          models: snapshot,
          options: settings,
          limits: {
            ...this.limits,
            max_memory_bytes: this.limits.max_memory_bytes - occupied,
          },
        },
        (progress) => {
          try {
            options.on_progress?.(progress);
          } catch (error) {
            callbackError = error;
            job.cancel();
          }
        },
        transfer,
      );
      cancel = () => job.cancel();
      signal?.addEventListener("abort", cancel, { once: true });
      if (signal?.aborted) cancel();
      try {
        return await job;
      } catch (error) {
        throw callbackError || error;
      }
    } finally {
      if (cancel) signal?.removeEventListener("abort", cancel);
      this._exportBytes -= working;
    }
  }
  async download_models(options = {}) {
    const result = await this.export_models(options);
    if (options.signal?.aborted)
      throw new DOMException("Export cancelled", "AbortError");
    download(result.blob, result.filename);
    return result;
  }
  download_model(id, filename) {
    const data = this.get_stl_bin(id);
    if (data)
      download(
        new Blob([data], { type: "model/stl" }),
        filename ?? this._model(id).filename ?? "model.stl",
      );
  }
  async export_scene(options = {}) {
    const format = String(options.format || "").toLowerCase();
    if (!["vsb", "vsj"].includes(format))
      throw new Error("Scene format must be vsb or vsj");
    if (
      options.force_basename !== undefined &&
      typeof options.force_basename !== "boolean"
    )
      throw new Error("force_basename must be a boolean");
    if (
      options.on_progress !== undefined &&
      typeof options.on_progress !== "function"
    )
      throw new Error("on_progress must be a function");
    const signal = options.signal;
    const checkAbort = () => {
      if (signal?.aborted)
        throw new DOMException("Export cancelled", "AbortError");
    };
    checkAbort();
    await this.when_ready;
    checkAbort();
    if (this.killsign) throw new Error("Viewer disposed");
    if (this._pending.size || this._sceneLoads.size)
      throw new Error(
        "Wait for models to finish opening before saving the scene",
      );
    const models = [...this._models.values()];
    if (!models.length) throw new Error("No models to export");
    if (models.some((m) => !m.geometry))
      throw new Error("A model has not finished loading");
    if (
      models.length + (format === "vsb" ? 1 : 0) >
      this.limits.max_archive_entries
    )
      throw new Error("Scene model count limit exceeded");
    const triangles = models.reduce((sum, m) => sum + m.geometry.triangles, 0);
    if (triangles > this.limits.max_triangles)
      throw new Error("Scene triangle limit exceeded");
    const scene = this.get_vsj(
      true,
      !!options.force_basename,
      format === "vsb",
    );
    const json = JSON.stringify(scene),
      manifestBytes = new Blob([json]).size;
    if (manifestBytes > this.limits.max_file_bytes)
      throw new Error("Scene manifest size limit exceeded");
    if (
      format === "vsb" &&
      manifestBytes + models.length * 84 + triangles * 50 >
        this.limits.max_uncompressed_bytes
    )
      throw new Error("Scene archive limit exceeded");
    // Snapshot, binary STL, compression workspace and output copies coexist.
    const working =
      MEMORY_OVERHEAD +
      json.length * 8 +
      (format === "vsb" ? triangles * 512 : 0);
    assertMemory(this.limits, this._occupiedMemory() + working, "scene export");
    this._exportBytes += working;
    let job, cancel, callbackError;
    try {
      // Capture mesh data and pose before invoking any host progress callback.
      const snapshot =
        format === "vsb"
          ? models.map((m, index) => ({
              id: m.id,
              triangles: m.geometry.triangles,
              positions: m.geometry.positions.slice(),
              colors: m.geometry.colors?.slice() || null,
              scale: scene.models[index].animation_state
                ? [1, 1, 1]
                : m.scaleVector,
              center: scene.models[index].animation_state
                ? [0, 0, 0]
                : [...m.center],
            }))
          : null;
      options.on_progress?.({
        loaded: 0,
        total: models.length,
        phase: "exporting",
      });
      checkAbort();
      let blob;
      if (format === "vsj") {
        blob = new Blob([json], { type: "application/json" });
        options.on_progress?.({
          loaded: models.length,
          total: models.length,
          phase: "complete",
        });
      } else {
        job = this._pool.run(
          {
            kind: "export-scene",
            scene,
            models: snapshot,
            limits: this.limits,
          },
          (progress) => {
            try {
              options.on_progress?.(progress);
            } catch (error) {
              callbackError = error;
              job.cancel();
            }
          },
          snapshot.flatMap((m) => [
            m.positions.buffer,
            ...(m.colors ? [m.colors.buffer] : []),
          ]),
        );
        cancel = () => job.cancel();
        signal?.addEventListener("abort", cancel, { once: true });
        if (signal?.aborted) cancel();
        try {
          blob = await job;
        } catch (error) {
          throw callbackError || error;
        }
      }
      checkAbort();
      return {
        blob,
        format,
        filename: exportFilename(options.filename, format),
        model_ids: models.map((m) => m.id),
        triangles,
        representation: "scene",
      };
    } finally {
      if (cancel) signal?.removeEventListener("abort", cancel);
      this._exportBytes -= working;
    }
  }
  async download_scene(options = {}) {
    const result = await this.export_scene(options);
    if (options.signal?.aborted || this.killsign)
      throw new DOMException("Export cancelled", "AbortError");
    download(result.blob, result.filename);
    return result;
  }
  get_vsj(as_js_obj = false, force_basename = false, for_vsb = false) {
    const data = {
      canvas_height: this.canvas_height,
      bg_color: this.bg_color,
      camera_state: this.get_camera_state(),
      camera_bookmarks: this.get_camera_bookmarks(),
      display_units: this.display_units || "mm",
      auto_rotate: this.auto_rotate,
      mouse_zoom: this.mouse_zoom,
      auto_resize: this.auto_resize,
      center_models: this.center_models,
      models: [],
    };
    if (this.grid) {
      data.grid = true;
      if (this.grid.infinite)
        data.infinite_grid = {
          spacing: this.grid.spacing,
          height: this.grid.height,
        };
    }
    for (const m of this._models.values())
      if (m.geometry) {
        const model = {
          id: for_vsb ? -1 : m.id,
          filename: for_vsb
            ? `${m.id}.stl`
            : force_basename
              ? basename(m.filename)
              : m.filename,
          units: m.units,
          size_state: {
            ...structuredClone(sizeState(m)),
            unit_factor:
              for_vsb && !m._animation
                ? 1
                : m.unitScale * (sizeState(m).unit_factor ?? 1),
          },
          ...(m.display_name ? { display_name: m.display_name } : {}),
          display: m.display,
          opacity: m.opacity,
          view_edges: m.view_edges,
          smooth_shading: m.smooth_shading,
          section: m.section ? { ...m.section } : null,
        };
        if (for_vsb)
          model.orig_filename = basename(m.orig_filename || m.filename);
        for (const key of transformKeys)
          if (!key.startsWith("scale")) model[key] = m[key];
        if (!for_vsb || m._animation) {
          model.scalex = m.scalex * m.unitScale;
          model.scaley = m.scaley * m.unitScale;
          model.scalez = m.scalez * m.unitScale;
        }
        if (m.color) model.color = m.color;
        const playback = savePlayback(m);
        if (playback) Object.assign(model, playback);
        else if (!for_vsb) {
          // VSJ references the original mesh. Re-express a changed pivot using
          // the scene's centering convention, including after a spin stops.
          const center = this.center_models
            ? m.geometry.bounds.min.map(
                (v, i) => (v + m.geometry.bounds.max[i]) / 2,
              )
            : [0, 0, 0];
          const position = transform(modelMatrix(m), center);
          ["x", "y", "z"].forEach((axis, i) => (model[axis] = position[i]));
        }
        data.models.push(model);
      }
    return as_js_obj ? data : JSON.stringify(data);
  }
  download_vsj(filename = "1.vsj") {
    download(
      new Blob([this.get_vsj()], { type: "application/json" }),
      filename,
    );
  }
  get_vsb() {
    return {
      vsj: this.get_vsj(true, true, true),
      files: [...this._models.values()]
        .filter((m) => m.geometry)
        .map((m) => ({
          id: m.id,
          bin: m._animation
            ? exportSTL(m.geometry, [1, 1, 1], [0, 0, 0])
            : this.get_stl_bin(m.id),
        })),
    };
  }
  async get_vsb_blob() {
    await this.when_ready;
    const scene = this.get_vsb(),
      job = this._pool.run(
        { kind: "zip", scene, limits: this.limits },
        null,
        scene.files.map((f) => f.bin),
      );
    // Keep the .vsb download name on platforms that infer extensions from MIME.
    return new Blob([await job], { type: "application/octet-stream" });
  }
  download_vsb(filename = "1.vsb") {
    return this.get_vsb_blob()
      .then((blob) =>
        download(blob, /\.vsb$/i.test(filename) ? filename : `${filename}.vsb`),
      )
      .catch((e) => this._error(e));
  }
  import_scene(source, options = {}) {
    return importScene.call(this, source, options);
  }
  _sceneLoad(source, zip) {
    const generation = this._generation;
    this._sessionActive = true;
    const promise = (async () => {
      await this.when_ready;
      if (generation !== this._generation || this.killsign) return;
      let scene,
        files,
        base = document.baseURI;
      if (typeof source === "string")
        base = new URL(source, document.baseURI).href;
      if (zip) {
        files = await this._pool.run({
          kind: "unzip",
          source: typeof source === "string" ? base : source,
          limits: this.limits,
        });
        if (!Object.hasOwn(files, "json_data.vsj"))
          throw new Error("VSB manifest json_data.vsj is missing");
        scene = JSON.parse(new TextDecoder().decode(files["json_data.vsj"]));
      } else {
        const controller = new AbortController();
        this._aborters.add(controller);
        try {
          scene = JSON.parse(
            new TextDecoder().decode(
              await readSource(
                typeof source === "string" ? base : source,
                this.limits.max_file_bytes,
                () => {},
                controller.signal,
              ),
            ),
          );
        } finally {
          this._aborters.delete(controller);
        }
      }
      if (generation !== this._generation || this.killsign) return;
      if (
        !scene ||
        !Array.isArray(scene.models) ||
        scene.models.length > this.limits.max_archive_entries
      )
        throw new Error("Invalid or oversized scene manifest");
      if (scene.bg_color !== undefined) this.set_bg_color(scene.bg_color);
      if (scene.center_models !== undefined)
        this.set_center_models(scene.center_models);
      if (scene.auto_rotate !== undefined)
        this.set_auto_rotate(scene.auto_rotate);
      if (scene.mouse_zoom !== undefined) this.set_mouse_zoom(scene.mouse_zoom);
      if (scene.auto_resize !== undefined)
        this.set_auto_resize(scene.auto_resize);
      if (scene.canvas_height !== undefined) {
        this.canvas_height = scene.canvas_height;
        this._setSizeStyle();
        this.do_resize();
      }
      if (scene.infinite_grid)
        this.set_infinite_grid(
          true,
          scene.infinite_grid.spacing,
          scene.infinite_grid.height,
        );
      else if (scene.grid) this.set_grid(true);
      if (scene.camera_state) this._restoreCamera = scene.camera_state;
      const bookmarks = mergeBookmarks(
        this.get_camera_bookmarks(),
        scene.camera_bookmarks || [],
      );
      const displayUnits = validateUnits(
        scene.display_units || this.display_units || "mm",
      );
      const incoming = [];
      try {
        for (const input of scene.models) {
          if (!input || typeof input !== "object")
            throw new Error("Invalid scene model");
          const model = modelOptions(input);
          delete model.mesh;
          delete model.data;
          delete model.local_file;
          if (files) {
            if (
              typeof model.filename !== "string" ||
              !Object.hasOwn(files, model.filename)
            )
              throw new Error("VSB model file is missing");
            model.local_file = new File(
              [files[model.filename]],
              model.filename,
            );
          } else if (model.filename)
            model.filename = new URL(model.filename, base).href;
          const id =
            model.id === undefined || model.id === -1
              ? this.max_model_id + 1
              : model.id;
          if (this._models.has(id))
            throw new Error(`Invalid or duplicate model id: ${id}`);
          this.add_model({
            ...model,
            id,
            animation: null,
            animation_state: null,
          });
          const m = this._models.get(id);
          if (!m) throw new Error(this.error || "Invalid scene model");
          m._sceneImportPending = true;
          incoming.push({ m, model, pending: this._pending.get(id) });
        }
        await Promise.all(incoming.map((item) => item.pending));
        if (generation !== this._generation || this.killsign) return;
        // Validate every playback before making any incoming model visible.
        for (const { m, model } of incoming) {
          if (this._models.get(m.id) !== m || !m.geometry)
            throw new Error("A scene model could not be opened");
          if (model.animation)
            createPlayback(model.animation, m, model.animation_state);
          else if (model.animation_state)
            throw new Error("Playback state needs an animation");
        }
        for (const { m, model } of incoming) {
          if (model.animation)
            this._startAnimation(m, model.animation, model.animation_state);
          m._sceneImportPending = false;
        }
        this.camera_bookmarks = bookmarks;
        this.display_units = displayUnits;
      } catch (error) {
        for (const { m } of incoming)
          if (this._models.get(m.id) === m) this.remove_model(m.id);
        throw error;
      }
    })()
      .catch((e) => {
        if (generation === this._generation && e.name !== "AbortError")
          this._error(e);
      })
      .finally(() => {
        this._sceneLoads.delete(promise);
        this._finishSession();
      });
    this._sceneLoads.add(promise);
    return undefined;
  }
  load_vsj(source) {
    return this._sceneLoad(source, false);
  }
  load_vsb(source) {
    return this._sceneLoad(source, true);
  }
  animate_model(id, animation) {
    return this._guard(() => {
      const m = this._model(id);
      if (!animation) {
        this._stopAnimation(m, "stopped");
        this._invalidate();
        return;
      }
      this._startAnimation(m, animation);
      this._invalidate();
    });
  }
  _startAnimation(m, definition, saved) {
    const playback = createPlayback(definition, m, saved);
    if (m._animation) this._stopAnimation(m, "replaced");
    if (saved) m.center = [...saved.center];
    m.animation = playback.animation;
    m._animation = playback;
    delete m.animation_state;
    m._animationResult = null;
    const running = evaluatePlayback(playback, m);
    if (running) this._animationEvent(m, saved ? "restored" : "started");
    else this._completeAnimation(m);
  }
  _animationEvent(m, reason) {
    const state = this._animationState(m);
    // No user callback runs inside an in-progress render, import or mutation.
    queueMicrotask(() => {
      this._callback("animation_state_callback", m.id, state, reason);
      if (reason === "completed")
        this._callback("animation_complete_callback", m.id, state);
    });
  }
  _animationState(m) {
    return m._animation
      ? playbackState(m._animation, !!this._animationSuspended)
      : {
          ...(m._animationResult ?? { status: "idle", elapsed_ms: 0 }),
          suspended: false,
          tracks: [],
        };
  }
  _stopAnimation(m, reason) {
    if (!m._animation && !m.animation) return;
    m._animationResult = {
      status: "stopped",
      elapsed_ms: m._animation?.elapsed_ms ?? 0,
    };
    m._animation = null;
    m.animation = null;
    delete m.animation_state;
    this._animationEvent(m, reason);
  }
  _completeAnimation(m) {
    m._animationResult = {
      status: "completed",
      elapsed_ms: m._animation.elapsed_ms,
    };
    m._animation = null;
    m.animation = null;
    this._animationEvent(m, "completed");
  }
  pause_model_animation(id) {
    return this._guard(() => {
      const m = this._model(id);
      if (!m._animation || m._animation.paused) return;
      m._animation.paused = true;
      m._animation.last_time = null;
      this._animationEvent(m, "paused");
      this._invalidate();
    });
  }
  resume_model_animation(id) {
    return this._guard(() => {
      const m = this._model(id);
      if (!m._animation || !m._animation.paused) return;
      m._animation.paused = false;
      m._animation.last_time = null;
      this._animationEvent(m, "resumed");
      this._invalidate();
    });
  }
  get_model_animation_state(id) {
    return this._guard(() => this._animationState(this._model(id)));
  }
  _suspendAnimations(suspended) {
    this._animationSuspended = !!suspended;
    this._lastTime = 0;
    for (const m of this._models.values())
      if (m._animation) m._animation.last_time = null;
    if (suspended) {
      cancelAnimationFrame(this._frame);
      this._frame = 0;
    } else this._invalidate();
  }
  _animate(m, time) {
    if (this._animationSuspended || !m._animation) return;
    try {
      if (!advancePlayback(m._animation, m, time)) this._completeAnimation(m);
    } catch (error) {
      this._stopAnimation(m, "error");
      this._error(error);
    }
  }
  async get_image_blob(type = "image/png") {
    await this.when_idle();
    this._clip();
    this.renderer.draw(
      [...this._models.values()],
      this.camera,
      this.bg_color,
      false,
    );
    const result = new Promise((resolve, reject) =>
      this.canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Screenshot failed")),
        type,
      ),
    );
    this._invalidate();
    return result;
  }
}
export default StlViewer;
