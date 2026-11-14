import { StlViewer } from "./viewer.js";
import { memoryPolicy, estimateFile } from "./memory-policy.js";
import { sceneFormat } from "./scene-import.js";
import { scenePlacement, sceneFloor } from "./scene-layout.js";
import { syncAnimatedRecord, centerAnimationPivot } from "./model-state.js";
import {
  enginePosition,
  modelCenter,
  modelRadius,
  depthPosition,
} from "./model-transform.js";
import { bindModelMove } from "./model-move.js";

const axes = ["x", "y", "z"];
const formats = /\.(stl|obj|3mf|step|stp|iges|igs|vsb|vsj)$/i;
const zero = () => ({ x: 0, y: 0, z: 0 });
const failure = (code, message) => Object.assign(new Error(message), { code });

/** Optional UI-independent loading/editing session. Owns no page controls.
 * The container is used only by StlViewer when the first model is opened.
 * getModels/getModel return detached metadata, never geometry or private models.
 */
export class ViewerSession {
  constructor(container, options = {}) {
    if (options.viewer_options?.models)
      throw new TypeError("Use session.openFiles/openURL for initial models");
    if (options.viewer_options?.allow_drag_and_drop)
      throw new TypeError("Pass dropped files to session.openFiles");
    this._container = container;
    this._options = options;
    this._policy = memoryPolicy(options.device_memory);
    for (const key of Object.keys(this._policy.limits))
      if (options.viewer_options?.[key] !== undefined)
        this._policy.limits[key] = options.viewer_options[key];
    this._policy.budget = this._policy.limits.max_memory_bytes;
    this._records = new Map();
    this._queue = [];
    this._generation = 0;
    this._nextID = 0;
    this._loadingID = null;
    this._viewer = null;
    this._viewerPromise = null;
    this._drainPromise = null;
    this._busy = false;
    this._disposed = false;
    this._arrangement = "original";
    this._grid = { enabled: false, spacing: 1, height: 0 };
    this._bindings = new Set();
  }
  get viewer() {
    return this._viewer;
  }
  get busy() {
    return this._busy;
  }
  get arrangement() {
    return this._arrangement;
  }
  get grid() {
    return { ...this._grid };
  }
  get memoryPolicy() {
    return { ...this._policy, limits: { ...this._policy.limits } };
  }
  _assertActive() {
    if (this._disposed) throw new Error("ViewSTL session is disposed");
  }
  _emit(event) {
    if (!this._disposed) this._call(this._options.on_event, event);
  }
  _call(callback, ...args) {
    try {
      callback?.(...args);
    } catch (error) {
      console.error(error);
    }
  }
  _setBusy(value) {
    this._busy = value;
    this._emit({ type: "busy", busy: value });
  }
  _error(error, source) {
    this._emit({
      type: "error",
      code: error.code || "load-failed",
      message: error.message,
      source: source?.name,
    });
  }
  async ready() {
    this._assertActive();
    if (!this._viewerPromise) {
      this._viewerPromise = Promise.resolve()
        .then(async () => {
          this._assertActive();
          const supplied = this._options.viewer_options || {};
          const viewer = (this._viewer = new StlViewer(this._container, {
            ...this._policy.limits,
            worker_count: 1,
            worker_timeout: 600000,
            center_models: false,
            allow_drag_and_drop: false,
            ...supplied,
            loading_progress_callback: (status) => {
              if (this._busy && !this._sceneImport)
                this._emit({
                  type: "progress",
                  scene: false,
                  progress: status[this._loadingID] || {},
                });
              this._call(supplied.loading_progress_callback, status);
            },
            model_loaded_callback: (id) => {
              this._lastLoadedID = id;
              this._call(supplied.model_loaded_callback, id);
            },
            load_error_callback: (message) => {
              this._error(new Error(message));
              this._call(supplied.load_error_callback, message);
            },
            animation_state_callback: (id, state, reason) => {
              if (["started", "restored", "resumed"].includes(reason))
                this._arrangement = "custom";
              this._emit({ type: "animation", id, state, reason });
              this._call(supplied.animation_state_callback, id, state, reason);
            },
            animation_complete_callback: (...args) => {
              if (!this._disposed)
                this._call(supplied.animation_complete_callback, ...args);
            },
          }));
          await viewer.when_ready;
          this._assertActive();
          this._emit({ type: "ready" });
          return viewer;
        })
        .catch((error) => {
          this._viewer?.dispose();
          this._viewer = null;
          this._viewerPromise = null;
          throw error;
        });
    }
    return this._viewerPromise;
  }
  _record(id) {
    const record = this._records.get(id),
      model = this._viewer?._models.get(id);
    if (!record || !model?.geometry) return null;
    syncAnimatedRecord(record, model);
    record.color = model.color || (model.geometry.colors ? null : "#909090");
    return record;
  }
  getModel(id) {
    this._assertActive();
    const r = this._record(id);
    if (!r) return null;
    // Only constant-size metadata. Never copy geometry on UI refreshes.
    const { sourceFile, estimated, ...data } = r;
    return structuredClone({
      ...data,
      animation: this._viewer.get_model_animation_state(id),
      animationDefinition: this._viewer._models.get(id)?.animation || null,
    });
  }
  getModels() {
    this._assertActive();
    return [...this._records.keys()]
      .map((id) => this.getModel(id))
      .filter(Boolean);
  }
  _adopt(id, source = {}, imported = false) {
    const m = this._viewer._models.get(id),
      g = m.geometry;
    const record = {
      id,
      name:
        source.name ||
        String(m.display_name || m.orig_filename || m.filename)
          .split(/[\\/]/)
          .pop()
          .split(/[?#]/)[0],
      size: source.size ?? g.file_bytes ?? m.local_file?.size ?? null,
      units: g.units || m.units || null,
      embedded: !!g.colors,
      color: m.color || (g.colors ? null : "#909090"),
      estimated: g.triangles * 224,
      sourceFile: source.sourceFile || null,
    };
    syncAnimatedRecord(record, m);
    record.originalPosition = imported ? { ...record.position } : zero();
    record.originalRotation = imported ? { ...record.rotation } : zero();
    record.originalColor = record.color;
    this._records.set(id, record);
  }
  prepareManual(id) {
    this._assertActive();
    if (!this._record(id)) return;
    this._viewer.animate_model(id, null);
  }
  _renderTransform(record) {
    const p = enginePosition(record),
      r = record.rotation;
    this._viewer.set_rotation(
      record.id,
      ...axes.map((a) => ((r[a] % 360) * Math.PI) / 180),
    );
    this._viewer.set_position(record.id, p.x, p.y, p.z);
  }
  _setTransform(id, kind, value, limit) {
    this._assertActive();
    if (
      !this._records.has(id) ||
      !value ||
      !axes.every(
        (a) => Number.isFinite(value[a]) && Math.abs(value[a]) <= limit,
      )
    )
      return false;
    this.prepareManual(id);
    const record = this._records.get(id);
    record[kind] = { ...value };
    this._renderTransform(record);
    this._arrangement = "custom";
    return true;
  }
  setPosition(id, position) {
    return this._setTransform(id, "position", position, 1e12);
  }
  setRotation(id, degrees) {
    return this._setTransform(id, "rotation", degrees, 360000);
  }
  centerPivot(id) {
    this.prepareManual(id);
    const record = this._records.get(id);
    if (!record) return;
    centerAnimationPivot(record, this._viewer._models.get(id));
    this._arrangement = "custom";
  }
  _manipulationModel(id) {
    this.prepareManual(id);
    const record = this._record(id);
    return record
      ? { ...record, center: modelCenter(record), radius: modelRadius(record) }
      : null;
  }
  moveDepth(id, amount) {
    if (!Number.isFinite(amount))
      throw new TypeError("Depth amount must be finite");
    const model = this._manipulationModel(id);
    return model
      ? this.setPosition(
          id,
          depthPosition(model, this._viewer.get_camera_state(), amount),
        )
      : false;
  }
  bindManipulation(options) {
    this._assertActive();
    if (!this._viewer?.ready)
      throw new Error("Await session.ready() before binding manipulation");
    let arrangement,
      disposed = false;
    const binding = bindModelMove(this._viewer.canvas, {
      getCamera: () => this._viewer.get_camera_state(),
      getModel: (event) => this._manipulationModel(options.getModelId(event)),
      getTool: options.getTool,
      onMove: (id, position) => {
        this.setPosition(id, position);
        options.onChange?.(id);
      },
      onRotate: (id, rotation) => {
        this.setRotation(id, rotation);
        options.onChange?.(id);
      },
      onStart: (id) => {
        arrangement = this._arrangement;
        options.onStart?.(id);
      },
      onEnd: (id, cancelled) => {
        if (cancelled) this._arrangement = arrangement;
        options.onEnd?.(id, cancelled);
      },
    });
    const handle = {
      setEnabled: (value) => {
        if (!disposed) binding.setEnabled(value);
      },
      dispose: () => {
        if (disposed) return;
        disposed = true;
        binding.dispose();
        this._bindings.delete(handle);
      },
    };
    this._bindings.add(handle);
    return handle;
  }
  setArrangement(mode) {
    this._assertActive();
    if (!["original", "side-by-side", "custom"].includes(mode))
      throw new TypeError("Unknown arrangement");
    this._arrangement = mode;
    for (const id of this._records.keys()) this._record(id);
    if (mode === "custom") return;
    for (const record of this._records.values()) {
      this.prepareManual(record.id);
      if (mode === "original") record.rotation = { ...record.originalRotation };
    }
    const records = [...this._records.values()],
      positions = scenePlacement(records, mode);
    for (const { id, x, y, z } of positions) {
      const r = this._records.get(id);
      r.position = { x, y, z };
      this._renderTransform(r);
    }
    this.setGrid(
      this._grid.enabled,
      this._grid.spacing,
      sceneFloor(records, positions),
    );
    this._viewer?.set_auto_zoom();
  }
  setGrid(enabled, spacing = this._grid.spacing, height = this._grid.height) {
    this._assertActive();
    if (!Number.isFinite(spacing) || spacing <= 0 || !Number.isFinite(height))
      throw new TypeError("Grid spacing must be positive and height finite");
    this._viewer?.set_infinite_grid(enabled, spacing, height);
    this._grid = { enabled: !!enabled, spacing, height };
  }
  duplicate(id) {
    this._assertActive();
    const original = this._record(id);
    if (!original) throw new Error("Unknown model");
    const copy = this._viewer.duplicate_model(id);
    this._adopt(copy, { sourceFile: original.sourceFile }, true);
    const record = this._records.get(copy);
    record.animationPivot = original.animationPivot;
    record.originalColor = original.originalColor;
    this._nextID = Math.max(this._nextID, copy + 1);
    this._arrangement = "custom";
    return copy;
  }
  remove(id) {
    this._assertActive();
    if (!this._records.has(id)) return;
    this._viewer.remove_model(id);
    this._records.delete(id);
    this.setArrangement(this._arrangement);
  }
  openFiles(files) {
    this._assertActive();
    const accepted = [];
    for (const source of files) {
      if (!formats.test(source.name))
        this._error(
          failure("unsupported-format", "Unsupported model or scene format"),
          source,
        );
      else if (source.size === 0)
        this._error(failure("empty-file", "The file is empty"), source);
      else accepted.push(source);
    }
    const scenes = accepted.filter((f) => sceneFormat(f.name));
    if (scenes.length) {
      const batch = {
        files: accepted.filter((f) => !sceneFormat(f.name)),
        used: new Set(),
        failed: false,
      };
      for (const sceneFile of scenes)
        this._queue.push({ name: sceneFile.name, sceneFile, batch });
      this._queue.push({ remaining: batch });
    } else this._queue.push(...accepted);
    return this._drain();
  }
  openURL(value, format = "") {
    this._assertActive();
    if (!this._options.viewer_options?.url_import_endpoint)
      throw new Error("URL imports are not configured");
    const url = new URL(value.trim());
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error(
        "Use a public HTTP or HTTPS file URL without login credentials.",
      );
    if (format && !/^(stl|obj|3mf|step|stp|iges|igs|vsb|vsj)$/.test(format))
      throw new Error("Unsupported model or scene format");
    url.hash = "";
    const name = decodeURIComponent(
      url.pathname.split("/").at(-1) || "Remote model",
    ).slice(0, 200);
    this._queue.push({
      name,
      remote: url.href,
      format,
      size: 0,
      scene: ["vsb", "vsj"].includes(format) ? format : sceneFormat(name),
    });
    return this._drain();
  }
  _drain() {
    if (!this._drainPromise && this._queue.length) {
      // Schedule once before notifying listeners; reentrant openFiles joins this queue.
      this._drainPromise = Promise.resolve().then(() => this._drainQueue());
    }
    return this._drainPromise || Promise.resolve();
  }
  async _drainQueue() {
    try {
      while (true) {
        if (!this._queue.length) {
          this._setBusy(false);
          // A completion listener may enqueue another file synchronously.
          if (!this._queue.length) break;
        }
        const source = this._queue.shift(),
          token = this._generation;
        if (source.remaining) {
          if (!source.remaining.failed)
            this._queue.unshift(
              ...source.remaining.files.filter(
                (f) => !source.remaining.used.has(f),
              ),
            );
          continue;
        }
        this._setBusy(true);
        this._emit({ type: "opening", name: source.name });
        try {
          if (source.sceneFile || source.scene) {
            await this._openScene(source, token);
            continue;
          }
          const estimated = await estimateFile(source);
          if (token !== this._generation) continue;
          const resident = [...this._records.values()].reduce(
            (sum, r) => sum + r.estimated,
            0,
          );
          if (
            estimated + resident > this._policy.budget ||
            source.size > this._policy.limits.max_file_bytes
          )
            throw failure(
              "memory-budget",
              "Estimated scene memory budget exceeded",
            );
          const viewer = await this.ready();
          if (token !== this._generation) continue;
          viewer.do_resize();
          this._nextID = Math.max(this._nextID, viewer.max_model_id + 1);
          const id = this._nextID++;
          this._loadingID = id;
          this._lastLoadedID = null;
          viewer.add_model({
            id,
            display: "flat",
            ...(source.remote
              ? { remote_url: source.remote, remote_format: source.format }
              : source.url
                ? { filename: source.url }
                : { local_file: source }),
          });
          await viewer.when_idle();
          if (token !== this._generation) continue;
          this._loadingID = null;
          if (this._lastLoadedID !== id) {
            this._emit({ type: "load-failed", name: source.name });
            continue;
          }
          const loaded = viewer.get_model_info(id, { measurements: false });
          const colors = this._options.colors || [];
          if (!loaded.has_colors && colors.length)
            viewer.set_color(id, colors[this._records.size % colors.length]);
          this._adopt(id, {
            name: source.remote ? loaded.name : source.name,
            size: source.remote ? loaded.file_bytes : source.size,
            sourceFile: typeof source.slice === "function" ? source : null,
          });
          this.setArrangement(this._arrangement);
          this._emit({ type: "loaded", id, name: this._records.get(id).name });
        } catch (error) {
          if (source.batch) source.batch.failed = true;
          if (token === this._generation) {
            if (this._loadingID !== null)
              this._viewer?.remove_model(this._loadingID);
            this._loadingID = null;
            this._error(error, source);
          }
        }
      }
    } finally {
      this._drainPromise = null;
      if (this._busy) this._setBusy(false);
    }
  }
  async _openScene(source, token) {
    const viewer = await this.ready();
    if (token !== this._generation) return;
    const controller = (this._sceneImport = new AbortController());
    try {
      const chosen = source.batch?.files || [];
      const cached = [
        ...new Set(
          [...this._records.values()].map((r) => r.sourceFile).filter(Boolean),
        ),
      ];
      const companions = [
        ...chosen,
        ...(source.sceneFile
          ? cached.filter(
              (f) =>
                !chosen.some((s) => s.name === f.name) &&
                cached.filter((s) => s.name === f.name).length === 1,
            )
          : []),
      ];
      const result = await viewer.import_scene(
        source.sceneFile || source.remote,
        {
          format: source.scene || sceneFormat(source.name),
          signal: controller.signal,
          files: companions,
          on_progress: (progress) => {
            if (token === this._generation)
              this._emit({ type: "progress", scene: true, progress });
          },
        },
      );
      if (token !== this._generation) return;
      for (const file of result.used_files) source.batch?.used.add(file);
      for (const id of result.model_ids) {
        const m = viewer._models.get(id);
        this._adopt(
          id,
          {
            sourceFile: result.used_files.includes(m.local_file)
              ? m.local_file
              : null,
          },
          true,
        );
      }
      this._nextID = Math.max(this._nextID, viewer.max_model_id + 1);
      this._arrangement = "custom";
      this._grid = {
        enabled: !!viewer.grid,
        spacing: viewer.grid?.spacing || 1,
        height: viewer.grid?.height || 0,
      };
      this._emit({
        type: "scene-loaded",
        name: source.name,
        ids: result.model_ids,
      });
    } finally {
      if (this._sceneImport === controller) this._sceneImport = null;
    }
  }
  cancelLoading() {
    this._assertActive();
    this._generation++;
    this._queue.length = 0;
    this._sceneImport?.abort();
    if (this._loadingID !== null) this._viewer?.remove_model(this._loadingID);
    this._loadingID = null;
    this._setBusy(false);
  }
  clear() {
    this.cancelLoading();
    for (const binding of this._bindings) binding.setEnabled(false);
    this._viewer?.clean();
    this._records.clear();
    this._arrangement = "original";
    this.setGrid(false, 1, 0);
  }
  dispose() {
    if (this._disposed) return;
    this.cancelLoading();
    for (const binding of this._bindings) binding.dispose();
    this._disposed = true;
    this._viewer?.dispose();
    this._records.clear();
  }
}
