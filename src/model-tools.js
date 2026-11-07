import { modelMatrix, transform } from "./math.js";
import { savePlayback } from "./animation.js";
import { assertMemory, geometryMemory } from "./memory.js";
import { printMemory } from "./print-options.js";

const axes = ["x", "y", "z"];
export function validateUnits(units) {
  if (!["mm", "inch"].includes(units)) throw new Error("Choose mm or inch");
  return units;
}
export function validateSizeState(value) {
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.baseline_mm) ||
    value.baseline_mm.length !== 3 ||
    value.baseline_mm.some((v) => !Number.isFinite(v) || v < 0 || v > 1e12) ||
    typeof value.editable !== "boolean" ||
    (value.unit_factor !== undefined &&
      (!Number.isFinite(value.unit_factor) ||
        value.unit_factor <= 0 ||
        value.unit_factor > 1e12))
  )
    throw new Error("Invalid saved model size");
  return {
    version: 1,
    baseline_mm: [...value.baseline_mm],
    file_units: validateUnits(value.file_units),
    editable: value.editable,
    unit_factor: value.unit_factor ?? 1,
  };
}
export function sizeState(model) {
  return (model.size_state ??= {
    version: 1,
    baseline_mm: model.geometry.bounds.max.map(
      (v, i) => (v - model.geometry.bounds.min[i]) * model.unitScale,
    ),
    file_units: "mm",
    editable: !model.geometry.units,
    unit_factor: 1,
  });
}
export function modelSize(model) {
  if (!model.geometry) throw new Error("Wait for the model to finish opening");
  const state = sizeState(model);
  return {
    ...structuredClone(state),
    dimensions_mm: model.geometry.bounds.max.map(
      (v, i) => (v - model.geometry.bounds.min[i]) * model.scaleVector[i],
    ),
  };
}
// Resize about the world-space bounding-box center, without rebasing the pivot.
export function resizeModel(id, factors) {
  const m = this._model(id);
  modelSize(m);
  if (
    !Array.isArray(factors) ||
    factors.length !== 3 ||
    factors.some((v) => !Number.isFinite(v) || v <= 0)
  )
    throw new Error("Scale must be a positive finite number");
  const next = axes.map((a, i) => m["scale" + a] * factors[i]);
  if (next.some((v) => !Number.isFinite(v) || v < 1e-12 || v > 1e12))
    throw new Error("Scale is outside the supported range");
  const center = m.geometry.bounds.min.map(
    (v, i) => (v + m.geometry.bounds.max[i]) / 2,
  );
  const before = transform(modelMatrix(m), center);
  const cached = m._measurements;
  const oldKey = m.scaleVector.join(",");
  this._stopAnimation(m, "manual");
  axes.forEach((a, i) => (m["scale" + a] = next[i]));
  const after = transform(modelMatrix(m), center);
  axes.forEach((a, i) => (m[a] += before[i] - after[i]));
  m._stats = null;
  if (
    cached?.key === oldKey &&
    cached.positions === m.geometry.positions &&
    factors.every((v) => v === factors[0])
  ) {
    m._measurements = {
      ...cached,
      key: m.scaleVector.join(","),
      result: {
        ...cached.result,
        area_mm2: cached.result.area_mm2 * factors[0] ** 2,
        volume_mm3:
          cached.result.volume_mm3 == null
            ? null
            : cached.result.volume_mm3 * factors[0] ** 3,
      },
    };
  }
  this._invalidate();
  return modelSize(m);
}
export function setFileUnits(id, units) {
  validateUnits(units);
  const m = this._model(id),
    state = sizeState(m);
  if (!state.editable)
    throw new Error(
      "This model has explicit file units, already converted to millimetres",
    );
  if (state.file_units === units) return modelSize(m);
  const factor = units === "inch" ? 25.4 : 1 / 25.4;
  const result = resizeModel.call(this, id, [factor, factor, factor]);
  state.baseline_mm = state.baseline_mm.map((v) => v * factor);
  state.file_units = units;
  state.unit_factor = (state.unit_factor ?? 1) * factor;
  return { ...result, ...structuredClone(state) };
}
export function resetModelSize(id) {
  const size = modelSize(this._model(id));
  return resizeModel.call(
    this,
    id,
    size.dimensions_mm.map((v, i) => (v ? size.baseline_mm[i] / v : 1)),
  );
}
export function duplicateModel(id) {
  const source = this._model(id);
  modelSize(source);
  if (source._sceneImportPending)
    throw new Error("Wait for the scene to finish opening");
  if (
    this._models.size + 1 > this.limits.max_archive_entries ||
    [...this._models.values()].reduce(
      (n, m) => n + (m.geometry?.triangles || 0),
      source.geometry.triangles,
    ) > this.limits.max_triangles
  )
    throw new Error("Scene model or triangle limit exceeded");
  // Conservative accounting still reserves a full model, even when buffers are shared.
  assertMemory(
    this.limits,
    this._occupiedMemory() + geometryMemory(source.geometry),
    "duplicate",
  );
  const copy = {};
  for (const key of [
    "filename",
    "orig_filename",
    "local_file",
    "x",
    "y",
    "z",
    "rotationx",
    "rotationy",
    "rotationz",
    "opacity",
    "units",
    "display",
    "view_edges",
    "smooth_shading",
    "color",
  ])
    copy[key] = source[key];
  copy.id = this.max_model_id + 1;
  if (!Number.isSafeInteger(copy.id))
    throw new Error("Model ID limit exceeded");
  copy.display_name =
    (source.display_name || source.orig_filename || source.filename || "Model")
      .split(/[\\/]/)
      .pop() + " — copy";
  copy.center = [...source.center];
  copy.unitScale = 1;
  axes.forEach((a, i) => (copy["scale" + a] = source.scaleVector[i]));
  Object.defineProperty(copy, "scaleVector", {
    get: () => axes.map((a) => copy["scale" + a] * copy.unitScale),
  });
  // Base arrays are immutable; derived view arrays can be replaced independently.
  copy.geometry = { ...source.geometry };
  copy.section = source.section ? { ...source.section } : null;
  copy.size_state = structuredClone(sizeState(source));
  copy.size_state.unit_factor =
    (copy.size_state.unit_factor ?? 1) * source.unitScale;
  const saved = savePlayback(source);
  this.max_model_id = copy.id;
  this._models.set(copy.id, copy);
  this.models_ref[copy.id] = this.models.length;
  this.models.push(copy);
  this.models_count = this._models.size;
  if (saved)
    this._startAnimation(copy, saved.animation, {
      ...saved.animation_state,
      paused: true,
    });
  this._invalidate();
  return copy.id;
}

export const cameraDirections = {
  front: [
    [0, -1, 0],
    [0, 0, 1],
  ],
  back: [
    [0, 1, 0],
    [0, 0, 1],
  ],
  left: [
    [-1, 0, 0],
    [0, 0, 1],
  ],
  right: [
    [1, 0, 0],
    [0, 0, 1],
  ],
  top: [
    [0, 0, 1],
    [0, 1, 0],
  ],
  bottom: [
    [0, 0, -1],
    [0, -1, 0],
  ],
  isometric: [
    [1, -1, 1],
    [0, 0, 1],
  ],
};
export function cameraView(name) {
  const view = cameraDirections[name];
  if (!view) throw new Error("Unknown camera view");
  this.camera.position = this.camera.target.map((v, i) => v + view[0][i]);
  this.camera.up = [...view[1]];
  this.set_auto_zoom();
}
export function validateBookmarks(bookmarks) {
  if (!Array.isArray(bookmarks) || bookmarks.length > 32)
    throw new Error("Save up to 32 camera views");
  const names = new Set();
  return bookmarks.map((b) => {
    const name = typeof b?.name === "string" ? b.name.trim() : "";
    if (
      !name ||
      name.length > 80 ||
      /[\x00-\x1f]/.test(name) ||
      names.has(name)
    )
      throw new Error("Use a unique view name of 1–80 characters");
    names.add(name);
    const state = {};
    for (const key of ["position", "target", "up"]) {
      if (
        !b.camera?.[key] ||
        axes.some(
          (a) =>
            !Number.isFinite(b.camera[key][a]) ||
            Math.abs(b.camera[key][a]) > 1e15,
        )
      )
        throw new Error("Invalid saved camera");
      state[key] = Object.fromEntries(axes.map((a) => [a, b.camera[key][a]]));
    }
    const d = axes.map((a) => state.position[a] - state.target[a]),
      u = axes.map((a) => state.up[a]);
    if (
      Math.hypot(
        d[1] * u[2] - d[2] * u[1],
        d[2] * u[0] - d[0] * u[2],
        d[0] * u[1] - d[1] * u[0],
      ) < 1e-12
    )
      throw new Error("Degenerate saved camera");
    return { name, camera: state };
  });
}
export function mergeBookmarks(existing, incoming) {
  const result = validateBookmarks(existing),
    names = new Set(result.map((b) => b.name));
  for (const b of validateBookmarks(incoming)) {
    let name = b.name,
      n = 2;
    while (names.has(name)) name = b.name.slice(0, 70) + ` (${n++})`;
    names.add(name);
    result.push({ ...b, name });
  }
  return validateBookmarks(result);
}
export async function measureModel(id, options = {}) {
  await this.when_ready;
  const m = this._model(id),
    g = m.geometry;
  if (!g || m._sceneImportPending)
    throw new Error("Wait for the model to finish opening");
  const scale = m.scaleVector,
    key = scale.join(","),
    cached = m._measurements;
  if (options.signal?.aborted)
    throw new DOMException("Measurement cancelled", "AbortError");
  if (cached?.positions === g.positions && cached.key === key)
    return { ...cached.result };
  const working = printMemory(g.triangles),
    occupied = this._occupiedMemory();
  assertMemory(this.limits, occupied + working, "measurements");
  const release = this._reserveMemory(
    m,
    working + geometryMemory(g),
    "measurements",
  );
  const controller = new AbortController(),
    cancel = () => controller.abort();
  this._aborters.add(controller);
  (m._measureJobs ??= new Set()).add(controller);
  options.signal?.addEventListener("abort", cancel, { once: true });
  let job, callbackError;
  const check = () => {
    if (controller.signal.aborted || this.killsign)
      throw new DOMException("Measurement cancelled", "AbortError");
    if (
      this._models.get(id) !== m ||
      m.geometry.positions !== g.positions ||
      m.scaleVector.join(",") !== key
    )
      throw new Error("Model size changed. Calculate again.");
  };
  try {
    const positions = new Float32Array(g.positions.length);
    for (let start = 0; start < positions.length; start += 262144) {
      check();
      positions.set(g.positions.subarray(start, start + 262144), start);
      if (start + 262144 < positions.length)
        await new Promise((r) => setTimeout(r, 0));
    }
    job = this._pool.run(
      {
        kind: "measure",
        positions,
        scale,
        area: g.area,
        max_time_ms: options.max_time_ms ?? 30000,
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
          controller.abort();
        }
      },
      [positions.buffer],
    );
    controller.signal.addEventListener("abort", () => job.cancel(), {
      once: true,
    });
    check();
    let result;
    try {
      result = await job;
    } catch (error) {
      throw callbackError || error;
    }
    check();
    m._measurements = { positions: g.positions, key, result };
    return { ...result };
  } finally {
    job?.cancel?.();
    release();
    this._aborters.delete(controller);
    m._measureJobs.delete(controller);
    options.signal?.removeEventListener("abort", cancel);
  }
}
