//=========== Stl Viewer v2.0.0-rc.9, by Omri Rips, Viewstl.com, November 2026 ; admin@viewstl.com ===========
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/commonjs.js
var commonjs_exports = {};
__export(commonjs_exports, {
  StlViewer: () => StlViewer,
  ViewerSession: () => ViewerSession,
  default: () => viewer_default
});
module.exports = __toCommonJS(commonjs_exports);

// src/math.js
var add = (a, b) => a.map((v, i) => v + b[i]);
var sub = (a, b) => a.map((v, i) => v - b[i]);
var mul = (a, s) => a.map((v) => v * s);
var dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
var norm = (a) => mul(a, 1 / (Math.hypot(...a) || 1));
function multiply(a, b) {
  const out = new Float64Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
}
function transform(m, p, w = 1) {
  const d = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15] * w;
  return [0, 1, 2].map(
    (r) => (m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r] * w) / (w && d ? d : 1)
  );
}
function rotation(x, y, z) {
  const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z);
  return new Float64Array([
    c * e,
    a * f + b * e * d,
    b * f - a * e * d,
    0,
    -c * f,
    a * e - b * f * d,
    b * e + a * f * d,
    0,
    d,
    -b * c,
    a * c,
    0,
    0,
    0,
    0,
    1
  ]);
}
function modelMatrix(m) {
  const r = rotation(m.rotationx, m.rotationy, m.rotationz), s = m.scaleVector;
  for (let c = 0; c < 3; c++) for (let i = 0; i < 3; i++) r[c * 4 + i] *= s[c];
  const center = m.center || [0, 0, 0];
  for (let i = 0; i < 3; i++)
    r[12 + i] = [m.x, m.y, m.z][i] - r[i] * center[0] - r[4 + i] * center[1] - r[8 + i] * center[2];
  return r;
}
function inverse(m) {
  const a = Array.from({ length: 4 }, (_, r) => [
    ...Array.from({ length: 4 }, (_2, c) => m[c * 4 + r]),
    ...Array.from({ length: 4 }, (_2, c) => +(c === r))
  ]);
  for (let i = 0; i < 4; i++) {
    let p = i;
    for (let r = i + 1; r < 4; r++)
      if (Math.abs(a[r][i]) > Math.abs(a[p][i])) p = r;
    if (Math.abs(a[p][i]) < 1e-30) throw new Error("Singular transform");
    [a[p], a[i]] = [a[i], a[p]];
    const v = a[i][i];
    a[i] = a[i].map((x) => x / v);
    for (let r = 0; r < 4; r++)
      if (r !== i) {
        const t = a[r][i];
        a[r] = a[r].map((x, c) => x - t * a[i][c]);
      }
  }
  return new Float64Array(
    Array.from({ length: 16 }, (_, i) => a[i % 4][4 + Math.floor(i / 4)])
  );
}
function cameraMatrix(camera, aspect) {
  const z = norm(sub(camera.position, camera.target));
  let x = norm(cross(camera.up, z));
  if (Math.hypot(...x) < 0.5)
    x = norm(cross(Math.abs(z[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], z));
  const y = cross(z, x), eye = camera.position;
  const view = new Float64Array([
    x[0],
    y[0],
    z[0],
    0,
    x[1],
    y[1],
    z[1],
    0,
    x[2],
    y[2],
    z[2],
    0,
    -dot(x, eye),
    -dot(y, eye),
    -dot(z, eye),
    1
  ]);
  const f = 1 / Math.tan(Math.PI / 8), n = camera.near, far = camera.far;
  const projection = new Float64Array([
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + n) / (n - far),
    -1,
    0,
    0,
    2 * far * n / (n - far),
    0
  ]);
  return multiply(projection, view);
}
function rotateAxis(v, axis, angle) {
  const n = norm(axis), c = Math.cos(angle), s = Math.sin(angle);
  return add(add(mul(v, c), mul(cross(n, v), s)), mul(n, dot(n, v) * (1 - c)));
}
function rayBox(origin, direction, min, max) {
  let near = 0, far = Infinity;
  for (let a = 0; a < 3; a++) {
    if (Math.abs(direction[a]) < 1e-15) {
      if (origin[a] < min[a] || origin[a] > max[a]) return false;
      continue;
    }
    let x = (min[a] - origin[a]) / direction[a], y = (max[a] - origin[a]) / direction[a];
    if (x > y) [x, y] = [y, x];
    near = Math.max(near, x);
    far = Math.min(far, y);
    if (far < near) return false;
  }
  return true;
}
function rayTriangle(o, d, p, i) {
  const a = [p[i], p[i + 1], p[i + 2]], b = sub([p[i + 3], p[i + 4], p[i + 5]], a), c = sub([p[i + 6], p[i + 7], p[i + 8]], a);
  const h = cross(d, c), det = dot(b, h);
  if (Math.abs(det) < 1e-12) return Infinity;
  const s = sub(o, a), u = dot(s, h) / det;
  if (u < 0 || u > 1) return Infinity;
  const q = cross(s, b), v = dot(d, q) / det;
  if (v < 0 || u + v > 1) return Infinity;
  const t = dot(c, q) / det;
  return t >= 0 ? t : Infinity;
}

// src/animation.js
var animationKeys = [
  "x",
  "y",
  "z",
  "rotationx",
  "rotationy",
  "rotationz",
  "scalex",
  "scaley",
  "scalez"
];
var isScale = (key) => key.startsWith("scale");
var number = (value, name, positive2 = false) => {
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER || positive2 && value <= 0)
    throw new Error(`Invalid animation ${name}`);
  return value;
};
var object = (value, name) => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`Invalid animation ${name}`);
  return value;
};
function animationPose(model) {
  return Object.fromEntries(
    animationKeys.map((key) => [
      key,
      number(
        model[key] ?? (isScale(key) ? model.scale ?? 1 : 0),
        key,
        isScale(key)
      )
    ])
  );
}
function normalizeAnimation(input) {
  object(input, "definition");
  const result = {}, claimed = /* @__PURE__ */ new Set();
  for (const mode of ["delta", "exact"]) {
    if (input[mode] == null) continue;
    const source = object(input[mode], mode), values = {};
    const msec = number(source.msec ?? 300, "duration", true);
    if (source.loop !== void 0 && typeof source.loop !== "boolean")
      throw new Error("Animation loop must be a boolean");
    const loop = mode === "delta" && !!source.loop;
    for (const key of animationKeys) {
      const value = source[key] ?? (isScale(key) ? source.scale : void 0);
      if (value === void 0) continue;
      if (claimed.has(key))
        throw new Error(`Animation delta/exact conflict: ${key}`);
      number(value, key, mode === "exact" && isScale(key));
      if (loop && isScale(key) && value < 0)
        throw new Error("Looping scale deltas cannot be negative");
      values[key] = value;
      claimed.add(key);
    }
    if (!Object.keys(values).length)
      throw new Error("Animation track needs a transform");
    result[mode] = { ...values, msec, ...loop ? { loop: true } : {} };
  }
  if (!Object.keys(result).length)
    throw new Error("Animation needs delta or exact");
  return result;
}
function normalizePlaybackState(input) {
  object(input, "playback state");
  if (input.version !== 1 || typeof input.paused !== "boolean")
    throw new Error("Invalid animation playback state version or paused flag");
  const elapsed_ms = number(input.elapsed_ms, "elapsed time");
  if (elapsed_ms < 0) throw new Error("Invalid animation elapsed time");
  object(input.origin, "origin");
  for (const key of animationKeys) number(input.origin[key], key, isScale(key));
  if (!Array.isArray(input.center) || input.center.length !== 3)
    throw new Error("Invalid animation pivot");
  return {
    version: 1,
    elapsed_ms,
    paused: input.paused,
    origin: animationPose(input.origin),
    center: input.center.map((v) => number(v, "pivot"))
  };
}
function createPlayback(definition, model, saved) {
  const animation = normalizeAnimation(definition);
  const state = saved == null ? null : normalizePlaybackState(saved);
  const origin = state?.origin ?? animationPose(model);
  const tracks = Object.entries(animation).map(([mode, a]) => {
    const values = Object.entries(a).filter(
      ([key]) => animationKeys.includes(key)
    );
    if (mode === "delta")
      for (const [key, value] of values)
        number(origin[key] + value, `${key} endpoint`, isScale(key));
    return { mode, values, duration: a.msec, loop: !!a.loop, done: false };
  });
  const playback = {
    animation,
    origin,
    tracks,
    elapsed_ms: state?.elapsed_ms ?? 0,
    paused: state?.paused ?? false,
    last_time: null
  };
  evaluatePlayback({ ...playback, tracks: tracks.map((t) => ({ ...t })) }, {});
  return playback;
}
function evaluatePlayback(playback, model) {
  const updates = [];
  for (const track of playback.tracks) {
    if (track.done) continue;
    const fraction = playback.elapsed_ms / track.duration;
    const p = track.loop ? fraction : Math.min(fraction, 1);
    for (const [key, value] of track.values) {
      const from = playback.origin[key];
      const to = track.mode === "delta" ? from + value * p : from * (1 - p) + value * p;
      updates.push([key, number(to, `${key} result`, isScale(key))]);
    }
  }
  let scaleChanged = false;
  for (const [key, value] of updates) {
    scaleChanged ||= isScale(key) && model[key] !== value;
    model[key] = value;
  }
  for (const track of playback.tracks)
    if (!track.loop && playback.elapsed_ms >= track.duration) track.done = true;
  if (scaleChanged) model._stats = null;
  return playback.tracks.some((track) => !track.done);
}
function advancePlayback(playback, model, time) {
  if (playback.paused) return true;
  if (playback.last_time !== null)
    playback.elapsed_ms = number(
      playback.elapsed_ms + Math.max(0, time - playback.last_time),
      "elapsed time"
    );
  playback.last_time = time;
  return evaluatePlayback(playback, model);
}
function playbackState(playback, suspended = false) {
  return {
    status: playback.paused ? "paused" : "running",
    elapsed_ms: playback.elapsed_ms,
    suspended,
    tracks: playback.tracks.filter((t) => !t.done).map((t) => ({
      mode: t.mode,
      msec: t.duration,
      loop: t.loop,
      progress: t.loop ? playback.elapsed_ms % t.duration / t.duration : Math.min(1, playback.elapsed_ms / t.duration)
    }))
  };
}
function savePlayback(model) {
  const p = model._animation;
  if (!p) return null;
  const factor = model.unitScale ?? 1;
  const animation = structuredClone(p.animation), origin = { ...p.origin };
  for (const key of animationKeys.filter(isScale)) {
    origin[key] *= factor;
    for (const track of Object.values(animation))
      if (track[key] !== void 0) track[key] *= factor;
  }
  const animation_state = normalizePlaybackState({
    version: 1,
    origin,
    elapsed_ms: p.elapsed_ms,
    paused: p.paused,
    center: [...model.center]
  });
  return { animation: normalizeAnimation(animation), animation_state };
}

// src/memory.js
var MEMORY_OVERHEAD = 64 * 1024 * 1024;
var TRIANGLE_MEMORY = 224;
function geometryMemory(g) {
  if (!g) return 0;
  return g.triangles * TRIANGLE_MEMORY + (g.smoothNormals?.byteLength || 0) * 4 + ((g.edges?.byteLength || 0) + (g.wire?.byteLength || 0)) * 2;
}
function assertMemory(limits, bytes, operation = "model") {
  if (bytes > (limits.max_memory_bytes ?? Number.MAX_SAFE_INTEGER))
    throw new Error(
      `Estimated memory for this ${operation} exceeds the device safety budget. Use a smaller model or a device with more memory.`
    );
}
function derivedMemory(triangles, features) {
  return MEMORY_OVERHEAD + triangles * (TRIANGLE_MEMORY + (features.smooth ? 1536 : 0) + (features.edges || features.wire ? 2048 : 0));
}

// src/print-options.js
function printOptions(input = {}) {
  const level = input.level ?? "basic";
  if (!["basic", "detailed"].includes(level))
    throw new Error("Choose basic or detailed print checks");
  const number2 = (v, name, max = 1e9) => {
    if (!Number.isFinite(v) || v <= 0 || v > max)
      throw new Error(`Invalid ${name}`);
    return v;
  };
  let profile = null;
  if (input.profile != null) {
    if (input.profile.technology !== "fdm")
      throw new Error("Only FDM profiles are supported");
    profile = { technology: "fdm" };
    for (const key of ["min_wall_mm", "line_width_mm"])
      if (input.profile[key] != null)
        profile[key] = number2(input.profile[key], key);
    if (input.profile.overhang_degrees != null)
      profile.overhang_degrees = number2(
        input.profile.overhang_degrees,
        "overhang angle",
        89.9
      );
    if (input.profile.build_volume_mm != null) {
      if (!Array.isArray(input.profile.build_volume_mm) || input.profile.build_volume_mm.length !== 3)
        throw new Error("Build volume requires X, Y and Z");
      profile.build_volume_mm = input.profile.build_volume_mm.map(
        (v) => number2(v, "build volume")
      );
    }
  }
  const time = number2(input.max_time_ms ?? 3e4, "check time limit", 12e4);
  return {
    level,
    profile,
    apply_transforms: input.apply_transforms !== false,
    units_confirmed: input.units_confirmed === true,
    max_time_ms: time
  };
}
var printMemory = (triangles) => 64 * 1024 ** 2 + triangles * 2400;
var printSignature = (model) => JSON.stringify([
  model.x,
  model.y,
  model.z,
  model.rotationx,
  model.rotationy,
  model.rotationz,
  model.scaleVector,
  model.center,
  model.units,
  model.unitScale
]);

// src/model-tools.js
var axes = ["x", "y", "z"];
function validateUnits(units) {
  if (!["mm", "inch"].includes(units)) throw new Error("Choose mm or inch");
  return units;
}
function validateSizeState(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.baseline_mm) || value.baseline_mm.length !== 3 || value.baseline_mm.some((v) => !Number.isFinite(v) || v < 0 || v > 1e12) || typeof value.editable !== "boolean" || value.unit_factor !== void 0 && (!Number.isFinite(value.unit_factor) || value.unit_factor <= 0 || value.unit_factor > 1e12))
    throw new Error("Invalid saved model size");
  return {
    version: 1,
    baseline_mm: [...value.baseline_mm],
    file_units: validateUnits(value.file_units),
    editable: value.editable,
    unit_factor: value.unit_factor ?? 1
  };
}
function sizeState(model) {
  return model.size_state ??= {
    version: 1,
    baseline_mm: model.geometry.bounds.max.map(
      (v, i) => (v - model.geometry.bounds.min[i]) * model.unitScale
    ),
    file_units: "mm",
    editable: !model.geometry.units,
    unit_factor: 1
  };
}
function modelSize(model) {
  if (!model.geometry) throw new Error("Wait for the model to finish opening");
  const state = sizeState(model);
  return {
    ...structuredClone(state),
    dimensions_mm: model.geometry.bounds.max.map(
      (v, i) => (v - model.geometry.bounds.min[i]) * model.scaleVector[i]
    )
  };
}
function resizeModel(id, factors) {
  const m = this._model(id);
  modelSize(m);
  if (!Array.isArray(factors) || factors.length !== 3 || factors.some((v) => !Number.isFinite(v) || v <= 0))
    throw new Error("Scale must be a positive finite number");
  const next = axes.map((a, i) => m["scale" + a] * factors[i]);
  if (next.some((v) => !Number.isFinite(v) || v < 1e-12 || v > 1e12))
    throw new Error("Scale is outside the supported range");
  const center = m.geometry.bounds.min.map(
    (v, i) => (v + m.geometry.bounds.max[i]) / 2
  );
  const before = transform(modelMatrix(m), center);
  const cached = m._measurements;
  const oldKey = m.scaleVector.join(",");
  this._stopAnimation(m, "manual");
  axes.forEach((a, i) => m["scale" + a] = next[i]);
  const after = transform(modelMatrix(m), center);
  axes.forEach((a, i) => m[a] += before[i] - after[i]);
  m._stats = null;
  if (cached?.key === oldKey && cached.positions === m.geometry.positions && factors.every((v) => v === factors[0])) {
    m._measurements = {
      ...cached,
      key: m.scaleVector.join(","),
      result: {
        ...cached.result,
        area_mm2: cached.result.area_mm2 * factors[0] ** 2,
        volume_mm3: cached.result.volume_mm3 == null ? null : cached.result.volume_mm3 * factors[0] ** 3
      }
    };
  }
  this._invalidate();
  return modelSize(m);
}
function setFileUnits(id, units) {
  validateUnits(units);
  const m = this._model(id), state = sizeState(m);
  if (!state.editable)
    throw new Error(
      "This model has explicit file units, already converted to millimetres"
    );
  if (state.file_units === units) return modelSize(m);
  const factor = units === "inch" ? 25.4 : 1 / 25.4;
  const result = resizeModel.call(this, id, [factor, factor, factor]);
  state.baseline_mm = state.baseline_mm.map((v) => v * factor);
  state.file_units = units;
  state.unit_factor = (state.unit_factor ?? 1) * factor;
  return { ...result, ...structuredClone(state) };
}
function resetModelSize(id) {
  const size = modelSize(this._model(id));
  return resizeModel.call(
    this,
    id,
    size.dimensions_mm.map((v, i) => v ? size.baseline_mm[i] / v : 1)
  );
}
function duplicateModel(id) {
  const source = this._model(id);
  modelSize(source);
  if (source._sceneImportPending)
    throw new Error("Wait for the scene to finish opening");
  if (this._models.size + 1 > this.limits.max_archive_entries || [...this._models.values()].reduce(
    (n, m) => n + (m.geometry?.triangles || 0),
    source.geometry.triangles
  ) > this.limits.max_triangles)
    throw new Error("Scene model or triangle limit exceeded");
  assertMemory(
    this.limits,
    this._occupiedMemory() + geometryMemory(source.geometry),
    "duplicate"
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
    "color"
  ])
    copy[key] = source[key];
  copy.id = this.max_model_id + 1;
  if (!Number.isSafeInteger(copy.id))
    throw new Error("Model ID limit exceeded");
  copy.display_name = (source.display_name || source.orig_filename || source.filename || "Model").split(/[\\/]/).pop() + " \u2014 copy";
  copy.center = [...source.center];
  copy.unitScale = 1;
  axes.forEach((a, i) => copy["scale" + a] = source.scaleVector[i]);
  Object.defineProperty(copy, "scaleVector", {
    get: () => axes.map((a) => copy["scale" + a] * copy.unitScale)
  });
  copy.geometry = { ...source.geometry };
  copy.section = source.section ? { ...source.section } : null;
  copy.size_state = structuredClone(sizeState(source));
  copy.size_state.unit_factor = (copy.size_state.unit_factor ?? 1) * source.unitScale;
  const saved = savePlayback(source);
  this.max_model_id = copy.id;
  this._models.set(copy.id, copy);
  this.models_ref[copy.id] = this.models.length;
  this.models.push(copy);
  this.models_count = this._models.size;
  if (saved)
    this._startAnimation(copy, saved.animation, {
      ...saved.animation_state,
      paused: true
    });
  this._invalidate();
  return copy.id;
}
var cameraDirections = {
  front: [
    [0, -1, 0],
    [0, 0, 1]
  ],
  back: [
    [0, 1, 0],
    [0, 0, 1]
  ],
  left: [
    [-1, 0, 0],
    [0, 0, 1]
  ],
  right: [
    [1, 0, 0],
    [0, 0, 1]
  ],
  top: [
    [0, 0, 1],
    [0, 1, 0]
  ],
  bottom: [
    [0, 0, -1],
    [0, -1, 0]
  ],
  isometric: [
    [1, -1, 1],
    [0, 0, 1]
  ]
};
function cameraView(name) {
  const view = cameraDirections[name];
  if (!view) throw new Error("Unknown camera view");
  this.camera.position = this.camera.target.map((v, i) => v + view[0][i]);
  this.camera.up = [...view[1]];
  this.set_auto_zoom();
}
function validateBookmarks(bookmarks) {
  if (!Array.isArray(bookmarks) || bookmarks.length > 32)
    throw new Error("Save up to 32 camera views");
  const names = /* @__PURE__ */ new Set();
  return bookmarks.map((b) => {
    const name = typeof b?.name === "string" ? b.name.trim() : "";
    if (!name || name.length > 80 || /[\x00-\x1f]/.test(name) || names.has(name))
      throw new Error("Use a unique view name of 1\u201380 characters");
    names.add(name);
    const state = {};
    for (const key of ["position", "target", "up"]) {
      if (!b.camera?.[key] || axes.some(
        (a) => !Number.isFinite(b.camera[key][a]) || Math.abs(b.camera[key][a]) > 1e15
      ))
        throw new Error("Invalid saved camera");
      state[key] = Object.fromEntries(axes.map((a) => [a, b.camera[key][a]]));
    }
    const d = axes.map((a) => state.position[a] - state.target[a]), u = axes.map((a) => state.up[a]);
    if (Math.hypot(
      d[1] * u[2] - d[2] * u[1],
      d[2] * u[0] - d[0] * u[2],
      d[0] * u[1] - d[1] * u[0]
    ) < 1e-12)
      throw new Error("Degenerate saved camera");
    return { name, camera: state };
  });
}
function mergeBookmarks(existing, incoming) {
  const result = validateBookmarks(existing), names = new Set(result.map((b) => b.name));
  for (const b of validateBookmarks(incoming)) {
    let name = b.name, n = 2;
    while (names.has(name)) name = b.name.slice(0, 70) + ` (${n++})`;
    names.add(name);
    result.push({ ...b, name });
  }
  return validateBookmarks(result);
}
async function measureModel(id, options = {}) {
  await this.when_ready;
  const m = this._model(id), g = m.geometry;
  if (!g || m._sceneImportPending)
    throw new Error("Wait for the model to finish opening");
  const scale = m.scaleVector, key = scale.join(","), cached = m._measurements;
  if (options.signal?.aborted)
    throw new DOMException("Measurement cancelled", "AbortError");
  if (cached?.positions === g.positions && cached.key === key)
    return { ...cached.result };
  const working = printMemory(g.triangles), occupied = this._occupiedMemory();
  assertMemory(this.limits, occupied + working, "measurements");
  const release = this._reserveMemory(
    m,
    working + geometryMemory(g),
    "measurements"
  );
  const controller = new AbortController(), cancel = () => controller.abort();
  this._aborters.add(controller);
  (m._measureJobs ??= /* @__PURE__ */ new Set()).add(controller);
  options.signal?.addEventListener("abort", cancel, { once: true });
  let job, callbackError;
  const check = () => {
    if (controller.signal.aborted || this.killsign)
      throw new DOMException("Measurement cancelled", "AbortError");
    if (this._models.get(id) !== m || m.geometry.positions !== g.positions || m.scaleVector.join(",") !== key)
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
        max_time_ms: options.max_time_ms ?? 3e4,
        limits: {
          ...this.limits,
          max_memory_bytes: this.limits.max_memory_bytes - occupied
        }
      },
      (progress) => {
        try {
          options.on_progress?.(progress);
        } catch (error) {
          callbackError = error;
          controller.abort();
        }
      },
      [positions.buffer]
    );
    controller.signal.addEventListener("abort", () => job.cancel(), {
      once: true
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

// src/appearance.js
var DISPLAYS = [
  "flat",
  "smooth",
  "wireframe",
  "edges",
  "mesh",
  "xray",
  "studio",
  "orientation"
];
function validateView(display, smooth) {
  if (!DISPLAYS.includes(display)) throw new Error("Invalid display mode");
  if (typeof smooth !== "boolean")
    throw new Error("smooth_shading must be a boolean");
  return { display, smooth_shading: display === "smooth" || smooth };
}
function viewFeatures(view) {
  return {
    smooth: (view.smooth_shading || view.display === "smooth") && view.display !== "wireframe",
    edges: view.view_edges || view.display === "edges",
    wire: view.display === "wireframe",
    edgeAngle: view.display === "edges" ? 30 : 1
  };
}
function validateSection(section) {
  if (section == null) return null;
  if (!["x", "y", "z"].includes(section.axis))
    throw new Error("Section axis must be x, y or z");
  if (!Number.isFinite(section.position) || section.position < 0 || section.position > 1)
    throw new Error("Section position must be between 0 and 1");
  if (section.flip !== void 0 && typeof section.flip !== "boolean")
    throw new Error("Section flip must be a boolean");
  return {
    axis: section.axis,
    position: section.position,
    flip: section.flip ?? false
  };
}
function sectionPlane(bounds, section) {
  if (!section) return [0, 0, 0, 0];
  const axis = ["x", "y", "z"].indexOf(section.axis), sign = section.flip ? -1 : 1;
  const plane = [0, 0, 0, 0];
  plane[axis] = sign;
  plane[3] = -sign * (bounds.min[axis] + (bounds.max[axis] - bounds.min[axis]) * section.position);
  return plane;
}

// src/geometry.js
var DEFAULT_LIMITS = Object.freeze({
  max_file_bytes: 256 * 1024 * 1024,
  max_triangles: 5e6,
  max_uncompressed_bytes: 256 * 1024 * 1024,
  max_archive_entries: 1024,
  max_memory_bytes: Number.MAX_SAFE_INTEGER
});
function limitsWith(options = {}) {
  const limits = { ...DEFAULT_LIMITS };
  for (const key of Object.keys(limits))
    if (options[key] !== void 0) {
      if (!Number.isSafeInteger(options[key]) || options[key] < 1)
        throw new Error(`Invalid ${key}`);
      limits[key] = options[key];
    }
  return limits;
}
function colorRGB(value) {
  if (typeof value !== "string" || !/^#[\da-f]{6}$/i.test(value))
    throw new Error("Color must be #RRGGBB");
  return [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
}
function finishGeometry(positions, colors = null, limits = DEFAULT_LIMITS) {
  if (!(positions instanceof Float32Array) || !positions.length || positions.length % 9)
    throw new Error("Geometry must contain complete triangles");
  if (positions.length / 9 > limits.max_triangles)
    throw new Error("Triangle limit exceeded");
  assertMemory(
    limits,
    MEMORY_OVERHEAD + positions.length / 9 * TRIANGLE_MEMORY
  );
  if (colors && (!(colors instanceof Float32Array) || colors.length !== positions.length))
    throw new Error("Invalid vertex colors");
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity]
  };
  for (let i = 0; i < positions.length; i++) {
    const v = positions[i], a = i % 3;
    if (!Number.isFinite(v)) throw new Error("Non-finite vertex coordinate");
    bounds.min[a] = Math.min(bounds.min[a], v);
    bounds.max[a] = Math.max(bounds.max[a], v);
    if (colors && (!Number.isFinite(colors[i]) || colors[i] < 0 || colors[i] > 1))
      throw new Error("Invalid vertex color");
  }
  const normals = new Float32Array(positions.length), blocks = new Float32Array(Math.ceil(positions.length / 9 / 64) * 6);
  let area = 0, volume = 0, degenerateTriangles = 0;
  for (let i = 0; i < positions.length; i += 9) {
    const ax = positions[i + 3] - positions[i], ay = positions[i + 4] - positions[i + 1], az = positions[i + 5] - positions[i + 2];
    const bx = positions[i + 6] - positions[i], by = positions[i + 7] - positions[i + 1], bz = positions[i + 8] - positions[i + 2];
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, length = Math.hypot(nx, ny, nz);
    area += length / 2;
    volume += (positions[i] * nx + positions[i + 1] * ny + positions[i + 2] * nz) / 6;
    if (!length) degenerateTriangles++;
    for (let k = 0; k < 9; k += 3) {
      normals[i + k] = nx / (length || 1);
      normals[i + k + 1] = ny / (length || 1);
      normals[i + k + 2] = nz / (length || 1);
    }
    const block = Math.floor(i / 9 / 64) * 6;
    if (i / 9 % 64 === 0) {
      blocks.set(
        [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity],
        block
      );
    }
    for (let k = 0; k < 9; k++) {
      const a = k % 3;
      blocks[block + a] = Math.min(blocks[block + a], positions[i + k]);
      blocks[block + 3 + a] = Math.max(blocks[block + 3 + a], positions[i + k]);
    }
  }
  if (!Number.isFinite(area) || !Number.isFinite(volume))
    throw new Error("Geometry magnitude exceeds numeric limits");
  return {
    positions,
    normals,
    colors,
    blocks,
    bounds,
    triangles: positions.length / 9,
    area,
    volume: Math.abs(volume),
    degenerateTriangles
  };
}
function intersectGeometry(g, origin, direction, plane = [0, 0, 0, 0]) {
  if (!rayBox(origin, direction, g.bounds.min, g.bounds.max)) return Infinity;
  let nearest = Infinity;
  for (let b = 0; b < g.blocks.length; b += 6) {
    if (!rayBox(
      origin,
      direction,
      g.blocks.subarray(b, b + 3),
      g.blocks.subarray(b + 3, b + 6)
    ))
      continue;
    const start = b / 6 * 64 * 9, end = Math.min(start + 64 * 9, g.positions.length);
    for (let i = start; i < end; i += 9) {
      const t = rayTriangle(origin, direction, g.positions, i);
      if (t < nearest && plane[3] + plane[0] * (origin[0] + direction[0] * t) + plane[1] * (origin[1] + direction[1] * t) + plane[2] * (origin[2] + direction[2] * t) <= 0)
        nearest = t;
    }
  }
  return nearest;
}
function scaledStats(g, s) {
  if (s[0] === s[1] && s[1] === s[2])
    return {
      area: g.area * s[0] * s[0],
      volume: g.volume * Math.abs(s[0] ** 3)
    };
  let area = 0;
  const p = g.positions;
  for (let i = 0; i < p.length; i += 9) {
    const ax = (p[i + 3] - p[i]) * s[0], ay = (p[i + 4] - p[i + 1]) * s[1], az = (p[i + 5] - p[i + 2]) * s[2];
    const bx = (p[i + 6] - p[i]) * s[0], by = (p[i + 7] - p[i + 1]) * s[1], bz = (p[i + 8] - p[i + 2]) * s[2];
    area += Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx) / 2;
  }
  return { area, volume: g.volume * Math.abs(s[0] * s[1] * s[2]) };
}
function exportSTL(g, scale = [1, 1, 1], center = [0, 0, 0]) {
  const buffer = new ArrayBuffer(84 + g.triangles * 50), d = new DataView(buffer), p = g.positions;
  new Uint8Array(buffer).set(
    new TextEncoder().encode("Binary STL by ViewSTL 2")
  );
  d.setUint32(80, g.triangles, true);
  for (let i = 0; i < g.triangles; i++) {
    const o = 84 + i * 50, v = Array.from(
      { length: 9 },
      (_, k) => (p[i * 9 + k] - center[k % 3]) * scale[k % 3]
    );
    const a = [v[3] - v[0], v[4] - v[1], v[5] - v[2]], b = [v[6] - v[0], v[7] - v[1], v[8] - v[2]], n = [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ], l = Math.hypot(...n) || 1;
    for (let k = 0; k < 3; k++) d.setFloat32(o + k * 4, n[k] / l, true);
    for (let k = 0; k < 9; k++) d.setFloat32(o + 12 + k * 4, v[k], true);
    if (g.colors) {
      const c = [0, 1, 2].map((k) => Math.round(g.colors[i * 9 + k] * 31));
      d.setUint16(o + 48, 32768 | c[0] << 10 | c[1] << 5 | c[2], true);
    }
  }
  return buffer;
}

// src/infinite-grid.js
var vertex = `#version 300 es
precision highp float;
out vec2 screen;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);screen=p*2.0-1.0;gl_Position=vec4(screen,0,1);}`;
var fragment = `#version 300 es
precision highp float;
in vec2 screen;
uniform mat4 inverseVP;uniform mat4 vp;uniform vec3 eye;uniform float height;uniform float spacing;uniform vec3 color;
out vec4 result;
float line(vec2 p,float stepSize){vec2 v=p/stepSize;vec2 d=abs(fract(v-0.5)-0.5)/max(fwidth(v),vec2(0.00001));return 1.0-min(min(d.x,d.y),1.0);}
void main(){
 vec4 a=inverseVP*vec4(screen,-1,1),b=inverseVP*vec4(screen,1,1);vec3 nearPoint=a.xyz/a.w,farPoint=b.xyz/b.w;
 vec3 ray=farPoint-nearPoint;if(abs(ray.z)<0.0000001)discard;
 float t=(height-nearPoint.z)/ray.z;if(t<0.0)discard;
 vec3 p=nearPoint+t*ray;vec4 clip=vp*vec4(p,1);if(clip.w<=0.0)discard;
 float pixel=max(length(dFdx(p.xy)),length(dFdy(p.xy)));
 float level=log(max(pixel*50.0/spacing,0.000001))/log(10.0);
 float stepSize=spacing*pow(10.0,floor(level));float mixLevel=smoothstep(0.0,1.0,fract(level));
 float alpha=max(line(p.xy,stepSize)*(1.0-mixLevel)*0.16,line(p.xy,stepSize*10.0)*0.30);
 alpha*=smoothstep(0.015,0.12,abs(ray.z)/length(ray));
 if(alpha<0.003)discard;
 gl_FragDepth=clamp(clip.z/clip.w*0.5+0.5+0.000001,0.0,0.999999);
 result=vec4(color,alpha);
}`;
var InfiniteGrid = class {
  constructor(gl) {
    this.gl = gl;
    const shaders = [];
    let program;
    try {
      for (const [type, source] of [
        [gl.VERTEX_SHADER, vertex],
        [gl.FRAGMENT_SHADER, fragment]
      ]) {
        const shader = gl.createShader(type);
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
          throw Error("Grid shader: " + gl.getShaderInfoLog(shader));
      }
      program = gl.createProgram();
      shaders.forEach((shader) => gl.attachShader(program, shader));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw Error("Grid program: " + gl.getProgramInfoLog(program));
      this.program = program;
      this.vao = gl.createVertexArray();
      if (!this.vao) throw Error("Graphics memory unavailable for grid");
      this.uniforms = Object.fromEntries(
        ["inverseVP", "vp", "eye", "height", "spacing", "color"].map((n) => [
          n,
          gl.getUniformLocation(program, n)
        ])
      );
    } catch (error) {
      if (program) gl.deleteProgram(program);
      throw error;
    } finally {
      shaders.forEach((shader) => gl.deleteShader(shader));
    }
  }
  draw(vp, camera, grid, background) {
    const gl = this.gl, u = this.uniforms;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniformMatrix4fv(u.inverseVP, false, new Float32Array(inverse(vp)));
    gl.uniformMatrix4fv(u.vp, false, new Float32Array(vp));
    gl.uniform3fv(u.eye, camera.position);
    gl.uniform1f(u.height, grid.height);
    gl.uniform1f(u.spacing, grid.spacing);
    const rgb = background === "transparent" ? [1, 1, 1] : colorRGB(background), dark = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 < 0.45;
    gl.uniform3fv(u.color, dark ? [0.68, 0.77, 0.81] : [0.37, 0.46, 0.5]);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA
    );
    gl.depthMask(false);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }
  dispose() {
    this.gl.deleteProgram(this.program);
    this.gl.deleteVertexArray(this.vao);
  }
};

// src/selection-frame.js
function selectionFrame(bounds) {
  const padding = Math.max(
    Math.max(...bounds.max.map((v, i) => v - bounds.min[i])) * 0.015,
    ...[...bounds.min, ...bounds.max].map((v) => Math.abs(v) * 2e-7),
    1e-7
  );
  const corner = (n) => [0, 1, 2].map(
    (i) => n & 1 << i ? bounds.max[i] + padding : bounds.min[i] - padding
  );
  const lines = [];
  for (let n = 0; n < 8; n++)
    for (let axis = 0; axis < 3; axis++)
      if (!(n & 1 << axis))
        lines.push(...corner(n), ...corner(n | 1 << axis));
  return new Float32Array(lines);
}

// src/renderer.js
var vertex2 = `#version 300 es
precision highp float;
layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
layout(location=2) in vec3 color;
uniform mat4 mvp; uniform mat4 modelMatrix; uniform mat3 normalMatrix;
out vec3 vNormal; out vec3 vColor; out vec3 vPosition; out vec3 vWorld; out vec3 vBary;
void main(){vNormal=normalMatrix*normal;vColor=color;vPosition=position;
vWorld=(modelMatrix*vec4(position,1.0)).xyz;
int corner=gl_VertexID%3;vBary=corner==0?vec3(1,0,0):(corner==1?vec3(0,1,0):vec3(0,0,1));
gl_Position=mvp*vec4(position,1.0);}`;
var fragment2 = `#version 300 es
precision highp float;
in vec3 vNormal;in vec3 vColor;in vec3 vPosition;in vec3 vWorld;in vec3 vBary;
uniform vec3 tint;uniform vec3 light;uniform float opacity;uniform bool unlit;uniform bool useColors;
uniform vec3 eye;uniform vec4 section;uniform int appearance;
out vec4 result;
void main(){float cut=dot(vec4(vPosition,1.0),section);if(cut>0.0)discard;
vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
float l=unlit?1.0:0.32+0.55*max(dot(n,light),0.0)+0.13*max(dot(n,normalize(vec3(-0.7,-0.3,0.8))),0.0);
vec3 base=tint*(useColors?vColor:vec3(1));vec3 color=base*l;float alpha=opacity;
vec3 view=normalize(eye-vWorld);
if(!unlit){
  if(appearance==1){vec3 w=max(fwidth(vBary),vec3(0.000001));vec3 edge=smoothstep(vec3(0.0),w*1.15,vBary);color=mix(vec3(0.12,0.18,0.21),color,min(min(edge.x,edge.y),edge.z));}
  if(appearance==2){float rim=pow(1.0-abs(dot(n,view)),2.0);color=mix(base*0.7,base, rim);alpha*=0.12+0.28*rim;}
  if(appearance==3){vec3 key=normalize(light+vec3(-0.4,0.5,0.6));float shine=pow(max(dot(n,normalize(key+view)),0.0),36.0);float rim=pow(1.0-max(dot(n,view),0.0),3.0);color=base*(0.45+0.5*max(dot(n,key),0.0))+vec3(0.26)*shine+vec3(0.08)*rim;}
  if(appearance==4)color=(gl_FrontFacing?vec3(0.12,0.55,0.72):vec3(0.9,0.24,0.32))*(0.55+0.45*l);
  if(dot(section.xyz,section.xyz)>0.0 && abs(cut)<max(fwidth(cut)*1.2,0.0000001)){color=vec3(0.93,0.57,0.17);alpha=opacity;}
}
result=vec4(color,alpha);}`;
var Renderer = class {
  constructor(canvas, onLost, onRestored, onError) {
    this.canvas = canvas;
    this.domElement = canvas;
    this.resources = /* @__PURE__ */ new Map();
    this.sharedResources = /* @__PURE__ */ new WeakMap();
    this.frames = 0;
    this.lost = false;
    this.gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false
    });
    if (!this.gl)
      throw new Error(
        "WebGL2 is unavailable. Enable browser graphics acceleration or try another browser/device."
      );
    this.lostHandler = (e) => {
      e.preventDefault();
      this.lost = true;
      this.resources.clear();
      this.sharedResources = /* @__PURE__ */ new WeakMap();
      this.gridResource = null;
      this.infiniteGrid = null;
      this.selectionResource = null;
      this.diagnosticResource = null;
      onLost();
    };
    this.restoredHandler = () => {
      try {
        this.initialize();
        this.lost = false;
        onRestored();
      } catch (e) {
        onError(e);
      }
    };
    canvas.addEventListener("webglcontextlost", this.lostHandler);
    canvas.addEventListener("webglcontextrestored", this.restoredHandler);
    this.initialize();
  }
  initialize() {
    const gl = this.gl, shaders = [];
    let program;
    try {
      for (const [type, source] of [
        [gl.VERTEX_SHADER, vertex2],
        [gl.FRAGMENT_SHADER, fragment2]
      ]) {
        const shader = gl.createShader(type);
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
          throw new Error(
            `Shader compilation failed: ${gl.getShaderInfoLog(shader)}`
          );
      }
      program = gl.createProgram();
      for (const shader of shaders) gl.attachShader(program, shader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error(`Shader link failed: ${gl.getProgramInfoLog(program)}`);
      this.program = program;
      this.uniforms = Object.fromEntries(
        [
          "mvp",
          "modelMatrix",
          "normalMatrix",
          "tint",
          "light",
          "eye",
          "opacity",
          "unlit",
          "section",
          "appearance",
          "useColors"
        ].map((n) => [n, gl.getUniformLocation(program, n)])
      );
    } catch (e) {
      if (program) gl.deleteProgram(program);
      throw e;
    } finally {
      for (const shader of shaders) gl.deleteShader(shader);
    }
  }
  upload(positions, normals, colors) {
    const gl = this.gl, vao = gl.createVertexArray(), buffers = [];
    if (!vao) throw new Error("Graphics memory is unavailable for this model.");
    gl.bindVertexArray(vao);
    try {
      for (const [location2, array] of [
        [0, positions],
        [1, normals],
        [2, colors]
      ])
        if (array) {
          const buffer = gl.createBuffer();
          if (!buffer)
            throw new Error("Graphics memory is unavailable for this model.");
          buffers.push(buffer);
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);
          const error = gl.getError();
          if (error !== gl.NO_ERROR)
            throw new Error(
              error === gl.OUT_OF_MEMORY ? "Not enough graphics memory for this model. Try closing other tabs or using another device." : "The browser could not upload this model to the graphics device."
            );
          gl.enableVertexAttribArray(location2);
          gl.vertexAttribPointer(location2, 3, gl.FLOAT, false, 0, 0);
        }
      gl.bindVertexArray(null);
      return { vao, buffers, count: positions.length / 3 };
    } catch (error) {
      gl.bindVertexArray(null);
      for (const buffer of buffers) gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      throw error;
    }
  }
  free(resource) {
    if (!resource) return;
    for (const buffer of resource.buffers) this.gl.deleteBuffer(buffer);
    this.gl.deleteVertexArray(resource.vao);
  }
  remove(model) {
    if (this.diagnostic?.model === model) this.setDiagnostic(null);
    const resources = this.resources.get(model);
    if (resources)
      for (const resource of Object.values(resources)) {
        if (--resource.users === 0) {
          this.sharedResources.get(resource.source)?.delete(resource);
          this.free(resource);
        }
      }
    this.resources.delete(model);
  }
  clear() {
    this.setDiagnostic(null);
    this.setSelection(null);
    for (const model of this.resources.keys()) this.remove(model);
    this.free(this.gridResource);
    this.gridResource = null;
    this.infiniteGrid?.dispose();
    this.infiniteGrid = null;
  }
  get liveBuffers() {
    let n = (this.gridResource?.buffers.length || 0) + (this.selectionResource?.buffers.length || 0) + (this.diagnosticResource?.buffers.length || 0);
    const unique = /* @__PURE__ */ new Set();
    for (const r of this.resources.values())
      for (const b of Object.values(r)) unique.add(b);
    for (const b of unique) n += b.buffers.length;
    return n;
  }
  setDiagnostic(value) {
    this.free(this.diagnosticResource);
    this.diagnosticResource = null;
    this.diagnostic = value;
  }
  drawDiagnostic(vp) {
    const gl = this.gl, u = this.uniforms, d = this.diagnostic, m = modelMatrix(d.model);
    this.diagnosticResource ??= this.upload(d.positions);
    gl.uniformMatrix4fv(u.mvp, false, new Float32Array(multiply(vp, m)));
    gl.uniformMatrix4fv(u.modelMatrix, false, new Float32Array(m));
    gl.uniform4fv(u.section, [0, 0, 0, 0]);
    gl.uniform1i(u.appearance, 0);
    gl.uniform1i(u.useColors, 0);
    gl.uniform1i(u.unlit, 1);
    gl.uniform3fv(u.tint, [0.85, 0.16, 0.06]);
    gl.uniform1f(u.opacity, 1);
    gl.bindVertexArray(this.diagnosticResource.vao);
    gl.disable(gl.DEPTH_TEST);
    gl.drawArrays(gl.LINES, 0, this.diagnosticResource.count);
    gl.enable(gl.DEPTH_TEST);
  }
  setSelection(model) {
    if (this.selection === model) return;
    this.free(this.selectionResource);
    this.selectionResource = null;
    this.selection = model;
  }
  drawSelection(vp, background) {
    const gl = this.gl, u = this.uniforms, matrix = modelMatrix(this.selection);
    this.selectionResource ??= this.upload(
      selectionFrame(this.selection.geometry.bounds)
    );
    gl.uniformMatrix4fv(u.mvp, false, new Float32Array(multiply(vp, matrix)));
    gl.uniformMatrix4fv(u.modelMatrix, false, new Float32Array(matrix));
    gl.uniformMatrix3fv(
      u.normalMatrix,
      false,
      new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1])
    );
    gl.uniform4fv(u.section, [0, 0, 0, 0]);
    gl.uniform1i(u.appearance, 0);
    gl.uniform1i(u.useColors, 0);
    gl.uniform1i(u.unlit, 1);
    const bg = background === "transparent" ? [1, 1, 1] : colorRGB(background);
    gl.uniform3fv(
      u.tint,
      bg[0] + bg[1] + bg[2] < 1.5 ? [0.42, 0.81, 0.96] : [0.08, 0.43, 0.65]
    );
    gl.bindVertexArray(this.selectionResource.vao);
    gl.disable(gl.DEPTH_TEST);
    gl.uniform1f(u.opacity, 0.18);
    gl.drawArrays(gl.LINES, 0, this.selectionResource.count);
    gl.enable(gl.DEPTH_TEST);
    gl.uniform1f(u.opacity, 0.9);
    gl.drawArrays(gl.LINES, 0, this.selectionResource.count);
  }
  resource(model, mode) {
    let r = this.resources.get(model);
    if (!r) {
      r = {};
      this.resources.set(model, r);
    }
    if (!r[mode]) {
      const g = model.geometry, lines = mode === "edges" || mode === "wire", source = lines ? g[mode] : g.positions, normals = lines ? void 0 : mode === "smooth" ? g.smoothNormals : g.normals, colors = lines ? void 0 : g.colors;
      let entries = this.sharedResources.get(source);
      if (!entries) this.sharedResources.set(source, entries = /* @__PURE__ */ new Set());
      let resource = [...entries].find(
        (r2) => r2.normals === normals && r2.colors === colors
      );
      if (!resource) {
        resource = Object.assign(this.upload(source, normals, colors), {
          source,
          normals,
          colors,
          users: 0
        });
        entries.add(resource);
      }
      resource.users++;
      r[mode] = resource;
    }
    return r[mode];
  }
  setGrid(grid) {
    this.grid = grid;
    this.free(this.gridResource);
    this.gridResource = null;
  }
  resize(width, height, pixelRatio = 1) {
    const gl = this.gl, max = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    this.canvas.width = Math.min(
      max,
      Math.max(1, Math.round(width * pixelRatio))
    );
    this.canvas.height = Math.min(
      max,
      Math.max(1, Math.round(height * pixelRatio))
    );
  }
  draw(models, camera, background, showSelection = true) {
    if (this.lost) return;
    const gl = this.gl, u = this.uniforms;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(
      ...background === "transparent" ? [0, 0, 0, 0] : [...colorRGB(background), 1]
    );
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(this.program);
    gl.vertexAttrib3f(1, 0, 0, 1);
    gl.vertexAttrib3f(2, 1, 1, 1);
    gl.uniform3fv(u.light, norm(sub(camera.position, camera.target)));
    gl.uniform3fv(u.eye, camera.position);
    const vp = cameraMatrix(camera, this.canvas.width / this.canvas.height);
    const visible = models.filter(
      (m) => m.geometry && m.opacity > 0 && m.color !== "transparent"
    );
    const distance = (m) => {
      const c = transform(
        modelMatrix(m),
        m.geometry.bounds.min.map((x, i) => (x + m.geometry.bounds.max[i]) / 2)
      );
      const d = sub(c, camera.position);
      return dot(d, d);
    };
    const opaque = visible.filter(
      (m) => m.opacity >= 1 && m.display !== "xray"
    ), transparent = visible.filter((m) => m.opacity < 1 || m.display === "xray").sort((a, b) => distance(b) - distance(a));
    const draw = (m) => {
      const matrix = modelMatrix(m), inv = inverse(matrix), g = m.geometry;
      gl.uniformMatrix4fv(u.mvp, false, new Float32Array(multiply(vp, matrix)));
      gl.uniformMatrix4fv(u.modelMatrix, false, new Float32Array(matrix));
      gl.uniform4fv(u.section, sectionPlane(g.bounds, m.section));
      gl.uniform1i(
        u.appearance,
        { mesh: 1, xray: 2, studio: 3, orientation: 4 }[m.display] || 0
      );
      gl.uniformMatrix3fv(
        u.normalMatrix,
        false,
        new Float32Array([
          inv[0],
          inv[4],
          inv[8],
          inv[1],
          inv[5],
          inv[9],
          inv[2],
          inv[6],
          inv[10]
        ])
      );
      gl.uniform3fv(
        u.tint,
        m.color && m.color !== "transparent" ? colorRGB(m.color) : g.colors ? [1, 1, 1] : colorRGB("#909090")
      );
      gl.uniform1f(u.opacity, m.opacity);
      gl.uniform1i(u.useColors, +(!m.color && !!g.colors));
      const wire = m.display === "wireframe" && g.wire, mode = wire ? "wire" : (m.smooth_shading || m.display === "smooth") && g.smoothNormals ? "smooth" : "flat";
      gl.uniform1i(u.unlit, +!!wire);
      const showEdges = m.view_edges || m.display === "edges";
      if (showEdges) {
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(1, 1);
      }
      const r = this.resource(m, mode);
      gl.bindVertexArray(r.vao);
      if (m.display === "xray") {
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        gl.drawArrays(gl.TRIANGLES, 0, r.count);
        gl.cullFace(gl.BACK);
        gl.drawArrays(gl.TRIANGLES, 0, r.count);
        gl.disable(gl.CULL_FACE);
      } else gl.drawArrays(wire ? gl.LINES : gl.TRIANGLES, 0, r.count);
      gl.disable(gl.POLYGON_OFFSET_FILL);
      if (showEdges && g.edges) {
        gl.uniform1i(u.useColors, 0);
        gl.uniform3fv(u.tint, [0.08, 0.09, 0.11]);
        gl.uniform1i(u.unlit, 1);
        const edges = this.resource(m, "edges");
        gl.bindVertexArray(edges.vao);
        gl.drawArrays(gl.LINES, 0, edges.count);
      }
    };
    gl.disable(gl.BLEND);
    for (const model of opaque) draw(model);
    if (this.grid?.infinite) {
      this.infiniteGrid ??= new InfiniteGrid(gl);
      this.infiniteGrid.draw(vp, camera, this.grid, background);
      gl.useProgram(this.program);
    } else if (this.grid) {
      if (!this.gridResource) {
        const { size, divisions } = this.grid, lines = [];
        for (let i = 0; i <= divisions; i++) {
          const t = -size / 2 + size * i / divisions;
          lines.push(
            -size / 2,
            t,
            0,
            size / 2,
            t,
            0,
            t,
            -size / 2,
            0,
            t,
            size / 2,
            0
          );
        }
        this.gridResource = this.upload(new Float32Array(lines));
      }
      gl.uniformMatrix4fv(u.mvp, false, new Float32Array(vp));
      gl.uniform4fv(u.section, [0, 0, 0, 0]);
      gl.uniform1i(u.appearance, 0);
      gl.uniform1i(u.useColors, 0);
      gl.uniform3fv(u.tint, [0.7, 0.73, 0.78]);
      gl.uniform1f(u.opacity, 1);
      gl.uniform1i(u.unlit, 1);
      gl.bindVertexArray(this.gridResource.vao);
      gl.drawArrays(gl.LINES, 0, this.gridResource.count);
    }
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA
    );
    gl.depthMask(false);
    for (const model of transparent) draw(model);
    if (showSelection && this.selection && visible.includes(this.selection))
      this.drawSelection(vp, background);
    if (showSelection && this.diagnostic && models.includes(this.diagnostic.model))
      this.drawDiagnostic(vp);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    this.frames++;
  }
  dispose() {
    this.canvas.removeEventListener("webglcontextlost", this.lostHandler);
    this.canvas.removeEventListener(
      "webglcontextrestored",
      this.restoredHandler
    );
    this.clear();
    this.gl.deleteProgram(this.program);
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
};

// src/controls.js
var Controls = class {
  constructor(canvas, camera, invalidate, pick, type = 0) {
    this.enabled = true;
    this.noZoom = false;
    this.type = type;
    this.camera = camera;
    this.invalidate = invalidate;
    this.pointers = /* @__PURE__ */ new Map();
    this.cleanups = [];
    this.canvas = canvas;
    const on = (name, fn, options) => {
      canvas.addEventListener(name, fn, options);
      this.cleanups.push(() => canvas.removeEventListener(name, fn, options));
    };
    on("pointerdown", (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        button: e.button
      });
      pick(e, e.pointerType === "touch" ? 20 : e.button === 2 ? 3 : 1);
    });
    on("pointermove", (e) => {
      const previous = this.pointers.get(e.pointerId);
      if (!previous || !this.enabled) return;
      const next = { x: e.clientX, y: e.clientY, button: previous.button };
      if (this.pointers.size === 2) {
        const other = [...this.pointers.entries()].find(
          ([id]) => id !== e.pointerId
        )[1];
        const oldDistance = Math.hypot(
          previous.x - other.x,
          previous.y - other.y
        ), newDistance = Math.hypot(next.x - other.x, next.y - other.y);
        if (oldDistance > 0 && newDistance > 0)
          this.zoom(oldDistance / newDistance);
        this.pan((next.x - previous.x) / 2, (next.y - previous.y) / 2);
      } else if (previous.button === 2 || e.shiftKey || previous.button === 1)
        this.pan(next.x - previous.x, next.y - previous.y);
      else
        this.orbit(
          (next.x - previous.x) / Math.max(1, canvas.clientHeight) * Math.PI,
          (next.y - previous.y) / Math.max(1, canvas.clientHeight) * Math.PI
        );
      this.pointers.set(e.pointerId, next);
    });
    const release = (e) => {
      this.pointers.delete(e.pointerId);
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
    };
    on("pointerup", release);
    on("pointercancel", release);
    on("lostpointercapture", (e) => this.pointers.delete(e.pointerId));
    on(
      "wheel",
      (e) => {
        if (!this.enabled || this.noZoom) return;
        e.preventDefault();
        const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvas.clientHeight : 1);
        this.zoom(Math.exp(Math.max(-1, Math.min(1, delta * 1e-3))));
      },
      { passive: false }
    );
    on("dblclick", (e) => {
      if (this.enabled) pick(e, 11);
    });
    on("contextmenu", (e) => e.preventDefault());
  }
  orbit(dx, dy) {
    const c = this.camera;
    let offset = sub(c.position, c.target), up = norm(c.up);
    offset = rotateAxis(offset, up, -dx);
    const right = norm(cross(up, offset));
    const rotated = rotateAxis(offset, right, -dy);
    if (this.type === 1) {
      offset = rotated;
      c.up = norm(rotateAxis(up, right, -dy));
    } else {
      const d = norm(rotated), alignment = d.reduce((v, x, i) => v + x * up[i], 0);
      if (Math.abs(alignment) < 0.9995) offset = rotated;
    }
    c.position = add(c.target, offset);
    this.invalidate();
  }
  zoom(factor) {
    if (this.noZoom) return;
    const c = this.camera, offset = sub(c.position, c.target), distance = Math.hypot(...offset);
    const next = Math.max(1e-6, Math.min(1e15, distance * factor));
    c.position = add(c.target, mul(offset, next / (distance || 1)));
    this.invalidate();
  }
  pan(dx, dy) {
    const c = this.camera, offset = sub(c.position, c.target), right = norm(cross(c.up, offset)), up = norm(cross(offset, right));
    const scale = 2 * Math.hypot(...offset) * Math.tan(Math.PI / 8) / Math.max(1, this.canvas.clientHeight);
    const delta = add(mul(right, -dx * scale), mul(up, dy * scale));
    c.target = add(c.target, delta);
    c.position = add(c.position, delta);
    this.invalidate();
  }
  dispose() {
    for (const cleanup of this.cleanups) cleanup();
    this.pointers.clear();
  }
};

// src/worker-pool.js
var WorkerPool = class {
  constructor(url, { count = 2, timeout = 12e4, factory } = {}) {
    this.url = url;
    this.count = Math.max(1, Math.min(4, count));
    this.timeout = timeout;
    this.factory = factory;
    this.queue = [];
    this.active = /* @__PURE__ */ new Set();
    this.next = 0;
    this.disposed = false;
  }
  run(task, progress, transfer = []) {
    if (this.disposed) return Promise.reject(new Error("Viewer disposed"));
    const id = ++this.next;
    let job;
    const promise = new Promise((resolve, reject) => {
      job = { id, task, progress, transfer, resolve, reject };
      this.queue.push(job);
    });
    promise.cancel = () => this.cancel(job);
    this.pump();
    return promise;
  }
  cancel(job) {
    if (job.done) return;
    job.done = true;
    this.queue = this.queue.filter((j) => j !== job);
    clearTimeout(job.timer);
    job.worker?.terminate();
    this.active.delete(job);
    job.reject(new DOMException("Loading cancelled", "AbortError"));
    this.pump();
  }
  pump() {
    while (!this.disposed && this.active.size < this.count && this.queue.length) {
      const job = this.queue.shift();
      this.active.add(job);
      const end = (error, result) => {
        if (job.done) return;
        job.done = true;
        clearTimeout(job.timer);
        job.worker?.terminate();
        this.active.delete(job);
        error ? job.reject(error) : job.resolve(result);
        this.pump();
      };
      try {
        job.worker = this.factory ? this.factory() : new Worker(this.url, { type: "module", name: "ViewSTL parser" });
        job.worker.onmessage = ({ data }) => {
          if (data.id !== job.id) return;
          if (data.progress) {
            job.progress?.(data.progress);
            return;
          }
          end(data.error ? new Error(data.error) : null, data.result);
        };
        job.worker.onerror = (e) => {
          e.preventDefault();
          end(
            new Error(
              e.message || "Worker failed; check worker URL and Content Security Policy"
            )
          );
        };
        job.worker.onmessageerror = () => end(new Error("Invalid worker response"));
        job.timer = setTimeout(
          () => end(new Error("File processing timed out")),
          this.timeout
        );
        job.worker.postMessage({ id: job.id, task: job.task }, job.transfer);
      } catch (error) {
        end(error);
      }
    }
  }
  clear() {
    for (const job of [...this.queue, ...this.active]) this.cancel(job);
  }
  dispose() {
    this.disposed = true;
    this.clear();
  }
};

// src/scene-import.js
var sceneFormat = (name) => String(name || "").match(/\.(vsb|vsj)(?:[?#]|$)/i)?.[1].toLowerCase() || "";
function localSceneFile(reference, files) {
  let path;
  try {
    path = decodeURIComponent(reference.split(/[?#]/)[0]).replaceAll("\\", "/");
  } catch {
    throw new Error("Invalid scene filename encoding");
  }
  const candidates = [...new Set(files)];
  const exact = candidates.filter(
    (f) => (f.webkitRelativePath || f.name) === path
  );
  if (exact.length === 1) return exact[0];
  const matching = candidates.filter((f) => f.name === path.split("/").pop());
  if (matching.length > 1 || exact.length > 1)
    throw new Error("More than one supplied file matches " + path);
  return matching[0] || null;
}
function sceneURL(reference, base) {
  let url;
  try {
    url = base ? new URL(reference, base) : new URL(reference);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw new Error(
      "Scene references must be HTTP/HTTPS URLs without login credentials"
    );
  url.hash = "";
  return url.href;
}

// src/scene-import-controller.js
function importScene(source, options = {}) {
  const controller = new AbortController(), signal = controller.signal;
  const generation = this._generation, ids = [], added = /* @__PURE__ */ new Map(), usedFiles = /* @__PURE__ */ new Set();
  const hadModels = this._models.size > 0;
  let job, held = 0, oldCamera, committed = false, callbackError;
  const cancel = () => {
    controller.abort();
    job?.cancel?.();
    for (const [id, m] of added)
      if (this._models.get(id) === m) this.remove_model(id);
  };
  const check = () => {
    if (signal.aborted || generation !== this._generation || this.killsign)
      throw new DOMException("Scene opening cancelled", "AbortError");
  };
  const progress = (value) => options.on_progress?.(value);
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();
  signal.addEventListener("abort", () => job?.cancel?.(), { once: true });
  this._aborters.add(controller);
  const promise = (async () => {
    await this.when_ready;
    check();
    oldCamera = this.get_camera_state();
    const format = options.format || sceneFormat(typeof source === "string" ? source : source.name);
    if (!["vsb", "vsj"].includes(format))
      throw new Error("Choose VSB or VSJ for a scene");
    let remote, relay;
    if (typeof source === "string") {
      remote = sceneURL(source, document.baseURI);
      if (!this.options.url_import_endpoint)
        throw new Error("Configure url_import_endpoint for scene URL imports");
      relay = new URL(this.options.url_import_endpoint, document.baseURI).href;
      if (new URL(relay).origin !== location.origin)
        throw new Error("The URL relay must use the same origin as this page");
    }
    const available = this.limits.max_memory_bytes - this._occupiedMemory();
    assertMemory(
      this.limits,
      this._occupiedMemory() + MEMORY_OVERHEAD,
      "scene opening"
    );
    const limits = {
      ...this.limits,
      max_memory_bytes: available,
      max_file_bytes: Math.min(
        this.limits.max_file_bytes,
        Math.floor((available - MEMORY_OVERHEAD) / 4)
      )
    };
    held = Math.max(0, available - MEMORY_OVERHEAD);
    this._sceneBytes = (this._sceneBytes || 0) + held;
    job = this._pool.run(
      {
        kind: "read-scene",
        source,
        remote,
        relay,
        format,
        name: `scene.${format}`,
        limits
      },
      (p) => {
        try {
          progress({ ...p, phase: "reading-scene" });
        } catch (error) {
          callbackError = error;
          job.cancel();
        }
      }
    );
    let documentData;
    try {
      documentData = await job;
    } catch (error) {
      throw callbackError || error;
    }
    job = null;
    check();
    const { scene, files, base } = documentData;
    const bookmarks = mergeBookmarks(
      this.get_camera_bookmarks(),
      scene.camera_bookmarks || []
    );
    this._sceneBytes -= held;
    held = Object.values(files || {}).reduce((n, b) => n + b.byteLength, 0) + JSON.stringify(scene).length * 2;
    this._sceneBytes += held;
    const companions = options.files || [], missing = [];
    const models = scene.models.map((input) => {
      const model = { ...input };
      if (files)
        model.local_file = new File([files[input.filename]], input.filename);
      else {
        const local = localSceneFile(input.filename, companions);
        if (local) {
          model.local_file = local;
          usedFiles.add(local);
        } else {
          const url = sceneURL(input.filename, remote ? base : void 0);
          if (url) model.remote_url = url;
          else missing.push(input.filename);
        }
      }
      if (model.remote_url && !this.options.url_import_endpoint)
        throw new Error("Scene URL references require a configured URL relay");
      return model;
    });
    if (missing.length)
      throw new Error(
        "Choose the VSJ together with these model files: " + missing.slice(0, 8).join(", ") + (missing.length > 8 ? "\u2026" : "")
      );
    if (models.length + this._models.size > this.limits.max_archive_entries)
      throw new Error("Scene model count limit exceeded");
    for (let index = 0; index < models.length; index++) {
      check();
      progress({ phase: "opening-model", loaded: index, total: models.length });
      check();
      const input = models[index], id = this.max_model_id + 1;
      this.add_model({ ...input, id, animation: null, animation_state: null });
      const model = this._models.get(id);
      if (!model) throw new Error(this.error || "Invalid scene model");
      ids.push(id);
      added.set(id, model);
      model._sceneImportPending = true;
      await this._pending.get(id);
      check();
      if (this._models.get(id) !== model || !model.geometry)
        throw new Error(this.error || "A scene model could not be opened");
      const desired = scene.center_models ?? this.center_models ? model.geometry.bounds.min.map(
        (v, i) => (v + model.geometry.bounds.max[i]) / 2
      ) : [0, 0, 0];
      const delta = model.center.map((v, i) => v - desired[i]);
      const shift = transform(
        modelMatrix({
          ...model,
          x: 0,
          y: 0,
          z: 0,
          center: [0, 0, 0],
          scaleVector: model.scaleVector
        }),
        delta
      );
      if (input.animation)
        model.center = [...input.animation_state?.center ?? desired];
      else ["x", "y", "z"].forEach((axis, i) => model[axis] += shift[i]);
      if ([...this._models.values()].reduce(
        (n, m) => n + (m.geometry?.triangles || 0),
        0
      ) > this.limits.max_triangles)
        throw new Error("Scene triangle limit exceeded");
    }
    progress({
      phase: "complete",
      loaded: models.length,
      total: models.length
    });
    check();
    for (let index = 0; index < ids.length; index++) {
      const model = added.get(ids[index]), input = models[index];
      if (input.animation)
        this._startAnimation(model, input.animation, input.animation_state);
      model._sceneImportPending = false;
    }
    if (scene.bg_color !== void 0) this.set_bg_color(scene.bg_color);
    if (scene.infinite_grid)
      this.set_infinite_grid(
        true,
        scene.infinite_grid.spacing,
        scene.infinite_grid.height
      );
    else this.set_grid(!!scene.grid);
    if (scene.auto_rotate !== void 0)
      this.set_auto_rotate(scene.auto_rotate);
    this._restoreCamera = scene.camera_state || (hadModels ? oldCamera : null);
    this.camera_bookmarks = bookmarks;
    if (scene.display_units) this.display_units = scene.display_units;
    committed = true;
    return { model_ids: ids, scene, used_files: [...usedFiles] };
  })().catch((error) => {
    cancel();
    throw error;
  }).finally(() => {
    options.signal?.removeEventListener("abort", cancel);
    this._aborters.delete(controller);
    this._sceneBytes = (this._sceneBytes || 0) - held;
    this._sceneLoads.delete(promise);
    if (generation === this._generation && !this.killsign) {
      if (!committed && oldCamera) this._restoreCamera = oldCamera;
      this._finishSession();
    }
  });
  this._sessionActive = true;
  this._sceneLoads.add(promise);
  return promise;
}

// src/print-controller.js
var reports = /* @__PURE__ */ new WeakMap();
function reportCurrent(viewer, report) {
  const saved = reports.get(report);
  return !!saved && saved.viewer.deref() === viewer && saved.models.every(({ model: reference, geometry, signature }) => {
    const model = reference.deref();
    return model && viewer._models.get(model.id) === model && model.geometry === geometry.deref() && printSignature(model) === signature;
  });
}
async function checkPrintability(options = {}) {
  await this.when_ready;
  const settings = printOptions(options);
  if (this.killsign) throw new Error("Viewer disposed");
  let ids = options.model_ids;
  if (ids === "selected")
    ids = this.renderer?.selection ? [this.renderer.selection.id] : [];
  ids ??= [...this._models.keys()];
  if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length || ids.some((id) => !Number.isSafeInteger(id)))
    throw new Error("Choose one or more unique model IDs");
  if (ids.length > this.limits.max_archive_entries)
    throw new Error("Print check model limit exceeded");
  const models = ids.map((id) => {
    const model = this._model(id);
    if (!model.geometry || model._sceneImportPending)
      throw new Error("Wait for models to finish opening");
    return {
      model,
      geometry: model.geometry,
      signature: printSignature(model)
    };
  });
  const key = JSON.stringify([ids, settings]);
  if (options.signal?.aborted)
    throw new DOMException("Print check cancelled", "AbortError");
  if (this._printCache?.key === key && reportCurrent(this, this._printCache.report)) {
    const report = structuredClone(this._printCache.report);
    reports.set(report, reports.get(this._printCache.report));
    return report;
  }
  if (this._printJobs?.size)
    throw new Error("A print check is already running");
  this._printJobs ??= /* @__PURE__ */ new Map();
  const controller = new AbortController(), abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  this._aborters.add(controller);
  this._printJobs.set(controller, new Set(models.map((m) => m.model)));
  let job, held = 0, callbackError;
  const cancel = () => job?.cancel?.();
  controller.signal.addEventListener("abort", cancel);
  const check = () => {
    if (controller.signal.aborted || this.killsign)
      throw new DOMException("Print check cancelled", "AbortError");
    if (models.some(
      ({ model, geometry, signature }) => this._models.get(model.id) !== model || model.geometry !== geometry || printSignature(model) !== signature
    ))
      throw new Error("Model changed. Run the print check again.");
  };
  const progress = (value) => {
    check();
    options.on_progress?.(value);
  };
  const results = [];
  try {
    this._printCache = null;
    const reportBytes = models.length * 256 * 1024;
    assertMemory(
      this.limits,
      this._occupiedMemory() + reportBytes,
      "print report"
    );
    held = reportBytes;
    this._printBytes = (this._printBytes || 0) + held;
    for (let index = 0; index < models.length; index++) {
      check();
      const { model, geometry } = models[index], working = printMemory(geometry.triangles), occupied = this._occupiedMemory();
      assertMemory(this.limits, occupied + working, "print check");
      this._printBytes += working;
      held += working;
      const positions = new Float32Array(geometry.positions.length);
      for (let start = 0; start < positions.length; start += 262144) {
        check();
        positions.set(
          geometry.positions.subarray(start, start + 262144),
          start
        );
        if (start + 262144 < positions.length)
          await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const source = settings.apply_transforms ? model : {
        ...model,
        x: 0,
        y: 0,
        z: 0,
        rotationx: 0,
        rotationy: 0,
        rotationz: 0,
        center: [0, 0, 0],
        scaleVector: [1, 1, 1].map(
          () => model.unitScale * (model.size_state?.unit_factor ?? 1)
        )
      };
      progress({
        phase: "Starting",
        model_id: model.id,
        model_index: index,
        total_models: models.length
      });
      job = this._pool.run(
        {
          kind: "print-check",
          model: {
            id: model.id,
            name: model.orig_filename || model.filename || `Model ${model.id}`,
            positions,
            matrix: modelMatrix(source),
            source_units: geometry.units || null
          },
          options: settings,
          limits: {
            ...this.limits,
            max_memory_bytes: this.limits.max_memory_bytes - occupied
          }
        },
        (p) => {
          try {
            progress({
              ...p,
              model_id: model.id,
              model_index: index,
              total_models: models.length
            });
          } catch (error) {
            callbackError = error;
            controller.abort();
          }
        },
        [positions.buffer]
      );
      try {
        results.push(await job);
      } catch (error) {
        throw callbackError || error;
      } finally {
        job = null;
        this._printBytes -= working;
        held -= working;
      }
    }
    check();
    const report = {
      version: 1,
      model_ids: ids.slice(),
      settings,
      models: results,
      summary: results.some((r) => r.summary === "issues_found") ? "issues_found" : results.some((r) => r.summary === "incomplete") ? "incomplete" : "no_issues_found",
      scope: "Each model checked separately; no cross-model union or collision analysis.",
      estimated: !!settings.profile
    };
    const saved = {
      viewer: new WeakRef(this),
      models: models.map(({ model, geometry, signature }) => ({
        model: new WeakRef(model),
        geometry: new WeakRef(geometry),
        signature
      }))
    };
    reports.set(report, saved);
    const cached = structuredClone(report);
    reports.set(cached, saved);
    if (JSON.stringify(cached).length < 2 * 1024 * 1024 && this._occupiedMemory() + 4 * 1024 ** 2 <= this.limits.max_memory_bytes)
      this._printCache = { key, report: cached };
    progress({ phase: "Complete", total_models: models.length });
    return report;
  } finally {
    job?.cancel?.();
    this._printBytes = (this._printBytes || 0) - held;
    options.signal?.removeEventListener("abort", abort);
    this._aborters.delete(controller);
    this._printJobs.delete(controller);
  }
}
function showPrintability(report, { issue, model_id = report.model_ids[0] } = {}) {
  if (!reportCurrent(this, report))
    throw new Error("Print report is stale. Run the check again.");
  const result = report.models.find((m) => m.model_id === model_id), item = result?.checks.find((c) => c.code === issue);
  if (!item) throw new Error("Unknown print check issue");
  const model = this._model(model_id), p = model.geometry.positions, lines = [];
  if (item.edge_vertices?.length)
    lines.push(...item.edge_vertices.slice(0, 1536));
  else
    for (const i of item.triangle_ids.slice(0, 128)) {
      if (!Number.isInteger(i) || i < 0 || i >= model.geometry.triangles)
        continue;
      for (let k = 0; k < 3; k++)
        lines.push(
          ...p.subarray(i * 9 + k * 3, i * 9 + k * 3 + 3),
          ...p.subarray(
            i * 9 + (k + 1) % 3 * 3,
            i * 9 + (k + 1) % 3 * 3 + 3
          )
        );
    }
  if (lines.some((v) => !Number.isFinite(v)))
    throw new Error("Invalid print highlight");
  this.renderer.setDiagnostic(
    lines.length ? {
      model,
      positions: new Float32Array(lines),
      signature: printSignature(model)
    } : null
  );
  this._invalidate();
  return lines.length / 6;
}

// src/export-options.js
function exportFilename(filename, extension) {
  const name = String(filename || "scene").split(/[\\/]/).pop().split(/[?#]/)[0].replace(/[<>:"|*\x00-\x1f\x7f]/g, "_").replace(/\.(?:stl|obj|3mf|step|stp|iges|igs|zip|vsb|vsj)$/i, "").replace(/[. ]+$/g, "").slice(0, 160) || "scene";
  return `${name}.${extension}`;
}
function exportOptions(options = {}) {
  const aliases = { stp: "step", igs: "iges" };
  const requested = String(options.format || "").toLowerCase();
  const format = aliases[requested] || requested;
  if (!["stl", "obj", "3mf", "step", "iges"].includes(format))
    throw new Error("Export format must be stl, obj, 3mf, step or iges");
  const units = options.units ?? "mm";
  if (!["mm", "inch"].includes(units))
    throw new Error("Export units must be mm or inch");
  for (const key of ["apply_transforms", "colors"])
    if (options[key] !== void 0 && typeof options[key] !== "boolean")
      throw new Error(`${key} must be a boolean`);
  if (options.on_progress !== void 0 && typeof options.on_progress !== "function")
    throw new Error("on_progress must be a function");
  const colors = options.colors !== false && ["obj", "3mf"].includes(format);
  const extension = format === "obj" && colors ? "zip" : format;
  return {
    format,
    units,
    colors,
    apply_transforms: options.apply_transforms !== false,
    filename: exportFilename(options.filename, extension)
  };
}
function exportMemory(models, options) {
  const triangles = models.reduce((sum, m) => sum + m.geometry.triangles, 0);
  const perTriangle = {
    stl: 192,
    obj: 2400,
    "3mf": 3e3,
    step: 12e3,
    iges: 4e3
  };
  return MEMORY_OVERHEAD + triangles * perTriangle[options.format] + models.length * 4096;
}

// src/io.js
async function readSource(source, limit, progress = () => {
}, signal) {
  let stream, total = 0;
  if (source instanceof ArrayBuffer) {
    if (source.byteLength > limit) throw new Error("File size limit exceeded");
    progress(source.byteLength, source.byteLength);
    return source;
  }
  if (source instanceof Blob) {
    total = source.size;
    if (total > limit) throw new Error("File size limit exceeded");
    if (signal?.aborted)
      throw new DOMException("Loading cancelled", "AbortError");
    progress(0, total);
    const buffer = await source.arrayBuffer();
    if (signal?.aborted)
      throw new DOMException("Loading cancelled", "AbortError");
    progress(total, total);
    return buffer;
  } else {
    const url = new URL(String(source), globalThis.location?.href);
    if (!["http:", "https:", "blob:"].includes(url.protocol))
      throw new Error("Unsupported file URL protocol");
    const response = await fetch(url, { signal, credentials: "same-origin" });
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${url.pathname}`);
    total = Number(response.headers.get("content-length")) || 0;
    stream = response.body;
  }
  if (total > limit) throw new Error("File size limit exceeded");
  if (!stream) throw new Error("Empty response body");
  const reader = stream.getReader(), chunks = [];
  let size = 0;
  try {
    while (true) {
      if (signal?.aborted)
        throw new DOMException("Loading cancelled", "AbortError");
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new Error("File size limit exceeded");
      chunks.push(value);
      progress(size, Math.max(total, size));
    }
  } catch (error) {
    await reader.cancel().catch(() => {
    });
    throw error;
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(size);
  let p = 0;
  for (const chunk of chunks) {
    data.set(chunk, p);
    p += chunk.length;
  }
  progress(size, size);
  return data.buffer;
}

// src/three-bridge.js
function fromThreeMesh(mesh, limits) {
  if (!mesh?.isMesh && !mesh?.geometry)
    throw new Error("Expected a Three.js mesh");
  if (mesh.isSkinnedMesh || mesh.isInstancedMesh || mesh.children?.length || mesh.morphTargetInfluences?.some(Boolean))
    throw new Error("Only a static standalone Three.js mesh is supported");
  const material = mesh.material;
  if (Array.isArray(material) || material?.isShaderMaterial || material?.map)
    throw new Error(
      "Multiple, textured or shader materials need an application adapter"
    );
  const g = mesh.geometry;
  let positions, colors = null;
  if (g?.attributes?.position) {
    const p = g.attributes.position, indices = g.index, n = indices?.count ?? p.count;
    if (n % 3 || n / 3 > limits.max_triangles)
      throw new Error("Invalid or oversized mesh");
    positions = new Float32Array(n * 3);
    if (g.attributes.color) colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const j = indices ? indices.getX(i) : i;
      for (const [k, method] of ["getX", "getY", "getZ"].entries()) {
        positions[i * 3 + k] = p[method](j);
        if (colors) colors[i * 3 + k] = g.attributes.color[method](j);
      }
    }
  } else if (g?.vertices && g?.faces) {
    if (g.faces.length > limits.max_triangles)
      throw new Error("Triangle limit exceeded");
    positions = new Float32Array(g.faces.length * 9);
    if (material?.vertexColors) colors = new Float32Array(positions.length);
    g.faces.forEach((f, i) => {
      for (const [k, index] of [f.a, f.b, f.c].entries()) {
        const v = g.vertices[index];
        if (!v) throw new Error("Invalid mesh index");
        positions.set([v.x, v.y, v.z], i * 9 + k * 3);
        if (colors)
          colors.set([f.color.r, f.color.g, f.color.b], i * 9 + k * 3);
      }
    });
  } else throw new Error("Unsupported Three.js geometry");
  return finishGeometry(positions, colors, limits);
}
function toThreeMesh(model, THREE) {
  if (!THREE?.Mesh || !THREE?.BufferGeometry || !THREE?.BufferAttribute)
    throw new Error(
      "get_model_mesh requires options.three or globalThis.THREE; use get_model_data for native geometry"
    );
  const g = model.geometry, geometry = new THREE.BufferGeometry(), p = g.positions.slice(), s = model.scaleVector, c = model.center;
  for (let i = 0; i < p.length; i++) p[i] = (p[i] - c[i % 3]) * s[i % 3];
  const attribute = (name, array) => {
    const attr = new THREE.BufferAttribute(array, 3);
    if (geometry.setAttribute) geometry.setAttribute(name, attr);
    else geometry.addAttribute(name, attr);
  };
  attribute("position", p);
  if (g.colors && !model.color) attribute("color", g.colors.slice());
  geometry.computeVertexNormals();
  const material = new THREE.MeshLambertMaterial({
    color: model.color === "transparent" ? "#909090" : model.color || (g.colors ? "#ffffff" : "#909090"),
    vertexColors: g.colors && !model.color ? THREE.VertexColors ?? true : false,
    side: THREE.DoubleSide,
    transparent: model.opacity < 1 || model.color === "transparent",
    opacity: model.color === "transparent" ? 0 : model.opacity,
    wireframe: model.display === "wireframe",
    flatShading: model.display !== "smooth"
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(model.x, model.y, model.z);
  mesh.rotation.set(model.rotationx, model.rotationy, model.rotationz);
  return mesh;
}

// src/viewer.js
var transformKeys = [
  "x",
  "y",
  "z",
  "rotationx",
  "rotationy",
  "rotationz",
  "scalex",
  "scaley",
  "scalez"
];
var modelKeys = [
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
  "display_name"
];
var finite = (v, name) => {
  if (typeof v !== "number" || !Number.isFinite(v))
    throw new Error(`${name} must be a finite number`);
  return v;
};
var positive = (v, name) => {
  finite(v, name);
  if (v <= 0) throw new Error(`${name} must be positive`);
  return v;
};
var vector = (v, name) => [
  finite(v.x, `${name}.x`),
  finite(v.y, `${name}.y`),
  finite(v.z, `${name}.z`)
];
var asObject = (v) => ({ x: v[0], y: v[1], z: v[2] });
var basename = (name) => String(name || "model.stl").split(/[\\/]/).pop().split(/[?#]/)[0];
function download(blob, name) {
  const link = document.createElement("a"), url = URL.createObjectURL(blob);
  link.href = url;
  link.download = basename(name);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
}
function modelOptions(input) {
  const out = {};
  for (const k of modelKeys) if (Object.hasOwn(input, k)) out[k] = input[k];
  return out;
}
var StlViewer = class _StlViewer {
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
    this.models_ref = /* @__PURE__ */ Object.create(null);
    this.models_count = 0;
    this.max_model_id = -1;
    this.load_status = /* @__PURE__ */ Object.create(null);
    this.load_session = 0;
    this._models = /* @__PURE__ */ new Map();
    this._pending = /* @__PURE__ */ new Map();
    this._jobs = /* @__PURE__ */ new Map();
    this._derived = /* @__PURE__ */ new Set();
    this._memoryReservations = /* @__PURE__ */ new Map();
    this._exportBytes = 0;
    this._loadTail = Promise.resolve();
    this._sceneLoads = /* @__PURE__ */ new Set();
    this._aborters = /* @__PURE__ */ new Set();
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
      far: 1e4
    };
    this.when_ready = new Promise((resolve, reject) => {
      this._readyResolve = resolve;
      this._readyReject = reject;
    });
    this.when_ready.catch(() => {
    });
    for (const name of [
      "ready_callback",
      "all_loaded_callback",
      "model_loaded_callback",
      "load_error_callback",
      "loading_progress_callback",
      "on_model_drop",
      "animation_state_callback",
      "animation_complete_callback"
    ])
      this[name] = options[name] ?? null;
    this.onmousedown_callback = options.on_model_mousedown ?? options.on_model_mouseclick ?? null;
    queueMicrotask(() => this._initialize());
  }
  _initialize() {
    if (this.killsign) return;
    try {
      const o = this.options;
      this.limits = limitsWith(o);
      this.bg_color = o.bg_color ?? o.bgcolor ?? "transparent";
      if (this.bg_color !== "transparent") colorRGB(this.bg_color);
      if (o.worker_count !== void 0 && (!Number.isInteger(o.worker_count) || o.worker_count < 1 || o.worker_count > 4))
        throw new Error("worker_count must be 1\u20134");
      if (o.worker_timeout !== void 0)
        positive(o.worker_timeout, "worker_timeout");
      if (o.pixel_ratio !== void 0) positive(o.pixel_ratio, "pixel_ratio");
      if (o.controls !== void 0 && o.controls !== 0 && o.controls !== 1)
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
      this.canvas.style.cssText = "display:block;touch-action:none;outline-offset:3px;";
      this._setSizeStyle();
      this.canvas.tabIndex = 0;
      this.canvas.setAttribute(
        "aria-label",
        "3D model viewer. Drag to rotate, shift-drag to pan, scroll to zoom."
      );
      this.parent_element.appendChild(this.canvas);
      this.renderer = new Renderer(
        this.canvas,
        () => {
          this._suspendAnimations(true);
          this._message(
            "Graphics interrupted. Waiting for the browser to restore rendering\u2026"
          );
        },
        () => {
          this._removeMessage();
          this._suspendAnimations(this.canvas.ownerDocument.hidden);
          this._invalidate();
        },
        (e) => this._error(e)
      );
      this.controls = new Controls(
        this.canvas,
        this.camera,
        () => this._invalidate(),
        (e, type) => this._pick(e, type),
        o.controls ?? 0
      );
      this.controls.noZoom = !this.mouse_zoom;
      let workerURL = o.worker_url ?? _StlViewer.workerURL;
      if (o.worker_url === void 0 && typeof o.load_three_files === "string")
        workerURL = new URL(
          "viewstl.worker.js",
          new URL(o.load_three_files || "./", document.baseURI)
        ).href;
      if (!workerURL && !o.worker_factory)
        throw new Error("Specify worker_url when using the CommonJS build");
      this._pool = new WorkerPool(workerURL, {
        count: o.worker_count ?? 2,
        timeout: o.worker_timeout ?? 12e4,
        factory: o.worker_factory
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
        this.zoom >= 0 ? Math.max(this.zoom, 1e-6) : o.cameraz ?? 100
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
          f: () => this.set_auto_zoom()
        };
        if (actions[e.key]) {
          e.preventDefault();
          actions[e.key]();
        }
      };
      this.canvas.addEventListener("keydown", this._key);
      this._visibility = () => this._suspendAnimations(
        this.canvas.ownerDocument.hidden || this.renderer.lost
      );
      this.canvas.ownerDocument.addEventListener(
        "visibilitychange",
        this._visibility
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
          this._visibility
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
    this.canvas.style.width = typeof this.canvas_width === "number" ? `${this.canvas_width}px` : this.canvas_width;
    this.canvas.style.height = typeof this.canvas_height === "number" ? `${this.canvas_height}px` : this.canvas_height;
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
    if (this.killsign || !this.renderer || this.renderer.lost || this._frame || this._animationSuspended)
      return;
    this._frame = requestAnimationFrame((t) => {
      this._frame = 0;
      this._render(t);
    });
  }
  _render(time) {
    const elapsed = this._lastTime ? Math.min((time - this._lastTime) / 1e3, 0.1) : 0;
    this._lastTime = time;
    let animated = false;
    for (const m of this._models.values())
      if (m.geometry && !m._sceneImportPending && m._animation && !m._animation.paused) {
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
        this.bg_color
      );
    } catch (error) {
      this.renderer.clear();
      this._error(error);
      return;
    }
    if (animated || this.auto_rotate && this.controls.enabled)
      this._invalidate();
    else this._lastTime = 0;
  }
  _bounds() {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    let count = 0;
    for (const model of this._models.values())
      if (model.geometry && !model._sceneImportPending) {
        count++;
        const { bounds } = model.geometry, matrix = modelMatrix(model);
        for (let corner = 0; corner < 8; corner++) {
          const v = transform(
            matrix,
            [0, 1, 2].map((i) => bounds[corner & 1 << i ? "max" : "min"][i])
          );
          for (let i = 0; i < 3; i++) {
            min[i] = Math.min(min[i], v[i]);
            max[i] = Math.max(max[i], v[i]);
          }
        }
      }
    return count ? {
      min,
      max,
      center: min.map((v, i) => (v + max[i]) / 2),
      radius: Math.max(Math.hypot(...sub(max, min)) / 2, 1e-6)
    } : null;
  }
  _clip() {
    const b = this._bounds(), distance = Math.hypot(
      ...sub(this.camera.position, b?.center ?? this.camera.target)
    ), r = b?.radius ?? 10;
    this.camera.near = Math.max(
      1e-6,
      Math.min(r * 1e-3, Math.max(distance - r, 1e-6) * 0.1)
    );
    this.camera.far = Math.max(this.camera.near * 100, distance + r * 4, 100);
  }
  _progress(id, value) {
    if (!this._models.has(id) || this.killsign) return;
    this.load_status[id] = value;
    this._callback(
      "loading_progress_callback",
      this.load_status,
      this.load_session
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
      const supplied = modelOptions(input), name = supplied.filename ?? supplied.local_file?.name ?? "model.stl";
      if (/\.vsj(?:[?#]|$)/i.test(name))
        return this.load_vsj(supplied.local_file ?? name);
      if (/\.vsb(?:[?#]|$)/i.test(name))
        return this.load_vsb(supplied.local_file ?? name);
      const id = supplied.id === void 0 || supplied.id === -1 ? this.max_model_id + 1 : supplied.id;
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
        geometry: null
      };
      for (const key of transformKeys)
        m[key] = supplied[key] ?? (key.startsWith("scale") ? supplied.scale ?? 1 : 0);
      for (const key of transformKeys) {
        finite(m[key], key);
        if (key.startsWith("scale")) positive(m[key], key);
      }
      if (supplied.size_state)
        m.size_state = validateSizeState(supplied.size_state);
      if (supplied.display_name != null) {
        if (typeof supplied.display_name !== "string" || supplied.display_name.length > 1024)
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
          supplied.smooth_shading ?? m.display === "smooth"
        )
      );
      m.section = validateSection(supplied.section);
      m.units = supplied.units ?? "mm";
      if (!["mm", "inch"].includes(m.units)) throw new Error("Invalid units");
      m.color = supplied.color ?? (supplied.mesh?.material?.color?.getHexString ? "#" + supplied.mesh.material.color.getHexString() : null);
      if (m.color && m.color !== "transparent") colorRGB(m.color);
      m.view_edges = !!supplied.view_edges;
      m.animation = supplied.animation == null ? null : normalizeAnimation(supplied.animation);
      m.animation_state = supplied.animation_state == null ? null : normalizePlaybackState(supplied.animation_state);
      if (m.animation_state && !m.animation)
        throw new Error("Playback state needs an animation");
      if (m.animation) createPlayback(m.animation, m, m.animation_state);
      Object.defineProperty(m, "scaleVector", {
        get: () => [
          m.scalex * m.unitScale,
          m.scaley * m.unitScale,
          m.scalez * m.unitScale
        ]
      });
      this.max_model_id = Math.max(id, this.max_model_id);
      this._models.set(id, m);
      this.models_ref[id] = this.models.length;
      this.models.push(m);
      this.models_count = this._models.size;
      this._sessionActive = true;
      this.load_status[id] = { loaded: 0, total: 0 };
      const generation = this._generation;
      const work = this._loadModel(m, supplied, generation).then(() => {
        if (generation !== this._generation || this._models.get(id) !== m)
          return;
        this._pending.delete(id);
        this._finishSession();
        this._callback("model_loaded_callback", id);
      }).catch((error) => {
        if (generation === this._generation && this._models.get(id) === m) {
          this._pending.delete(id);
          this._deleteModel(m);
          if (error.name !== "AbortError") this._error(error);
          this._finishSession();
        }
      }).finally(() => {
        this._jobs.delete(m);
      });
      this._pending.set(id, work);
      return void 0;
    });
  }
  _occupiedMemory(except) {
    let bytes = (this._exportBytes || 0) + (this._sceneBytes || 0) + (this._printBytes || 0) + (this._printCache ? 4 * 1024 ** 2 : 0);
    for (const m of this._models.values())
      if (m !== except) {
        const reservations = this._memoryReservations?.get(m);
        bytes += Math.max(
          geometryMemory(m.geometry),
          [...reservations?.values() || []].reduce(
            (sum, r) => sum + r.bytes,
            0
          )
        );
      }
    return bytes;
  }
  _reserveMemory(m, bytes, kind = "derive") {
    this._memoryReservations ??= /* @__PURE__ */ new Map();
    let reservations = this._memoryReservations.get(m);
    if (!reservations)
      this._memoryReservations.set(m, reservations = /* @__PURE__ */ new Map());
    const key = {};
    reservations.set(key, { bytes, kind });
    return () => {
      reservations.delete(key);
      if (!reservations.size && this._memoryReservations.get(m) === reservations)
        this._memoryReservations.delete(m);
    };
  }
  async _loadModel(m, supplied, generation) {
    let release = () => {
    };
    if (this.options.max_memory_bytes !== void 0) {
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
    if (this.killsign || generation !== this._generation || this._models.get(m.id) !== m)
      return;
    const available = Math.max(
      1,
      this.limits.max_memory_bytes - this._occupiedMemory(m)
    );
    const limits = { ...this.limits, max_memory_bytes: available };
    assertMemory(limits, MEMORY_OVERHEAD, "scene");
    const releaseMemory = this.limits.max_memory_bytes < Number.MAX_SAFE_INTEGER ? this._reserveMemory(m, available - MEMORY_OVERHEAD, "parse") : () => {
    };
    try {
      const features = viewFeatures(m);
      if (supplied.mesh) m.geometry = fromThreeMesh(supplied.mesh, limits);
      else if (supplied.data)
        m.geometry = finishGeometry(
          new Float32Array(supplied.data.positions),
          supplied.data.colors ? new Float32Array(supplied.data.colors) : null,
          limits
        );
      else {
        const source = supplied.local_file ?? supplied.filename ?? supplied.remote_url;
        if (!source)
          throw new Error("A filename, local_file or mesh is required");
        let relay;
        if (supplied.remote_url) {
          const url = new URL(supplied.remote_url);
          if (!["https:", "http:"].includes(url.protocol) || url.username || url.password)
            throw new Error(
              "Use a public HTTP or HTTPS file URL without login credentials."
            );
          if (!this.options.url_import_endpoint)
            throw new Error(
              "Configure url_import_endpoint to import remote URLs through a relay."
            );
          relay = new URL(this.options.url_import_endpoint, document.baseURI).href;
          if (new URL(relay).origin !== location.origin)
            throw new Error(
              "The URL relay must use the same origin as this page."
            );
        }
        const task = this._pool.run(
          {
            kind: "parse",
            remote: supplied.remote_url,
            format: supplied.remote_format,
            relay,
            source: typeof source === "string" ? new URL(source, document.baseURI).href : source,
            name: m.display_name || m.filename,
            limits,
            features: features.smooth || features.edges || features.wire ? features : null
          },
          (p) => this._progress(m.id, p)
        );
        this._jobs.set(m, task);
        m.geometry = await task;
        if (supplied.remote_url) {
          m.filename = m.geometry.source_name;
          delete m.remote_url;
          delete m.remote_format;
        }
      }
      if (this.killsign || generation !== this._generation || this._models.get(m.id) !== m) {
        m.geometry = null;
        return;
      }
      if (this.center_models)
        m.center = m.geometry.bounds.min.map(
          (v, i) => (v + m.geometry.bounds.max[i]) / 2
        );
      if ((supplied.mesh || supplied.data) && (features.smooth || features.edges || features.wire))
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
    if (this.killsign || this._pending.size || this._sceneLoads.size || !this._sessionActive)
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
    this.models_ref = /* @__PURE__ */ Object.create(null);
    this.models_count = 0;
    this.max_model_id = -1;
    this.load_status = /* @__PURE__ */ Object.create(null);
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
          this._visibility
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
        ...this._derived
      ]);
    return this;
  }
  _derive(m, features) {
    const occupied = this._occupiedMemory(m) + [...this._memoryReservations?.get(m)?.values() || []].filter((r) => r.kind === "derive").reduce((sum, r) => sum + r.bytes, 0);
    const working = derivedMemory(m.geometry.triangles, {
      ...features,
      smooth: features.smooth || !!m.geometry.smoothNormals,
      edges: features.edges || !!m.geometry.edges,
      wire: features.wire || !!m.geometry.wire
    });
    assertMemory(this.limits, occupied + working, "view mode");
    const releaseMemory = this._reserveMemory(m, working - MEMORY_OVERHEAD);
    const generation = this._generation, revision = m._deriveRevision = (m._deriveRevision || 0) + 1;
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
            max_memory_bytes: this.limits.max_memory_bytes - occupied
          }
        },
        null,
        [positions.buffer]
      );
    } catch (error) {
      releaseMemory();
      throw error;
    }
    (m._deriveJobs ??= /* @__PURE__ */ new Set()).add(job);
    const promise = job.then((result) => {
      if (!this.killsign && generation === this._generation && revision === m._deriveRevision && this._models.get(m.id) === m) {
        Object.assign(m.geometry, result);
        this.renderer.remove(m);
        this._invalidate();
        return true;
      }
      return false;
    }).catch((e) => {
      if (e.name !== "AbortError" && generation === this._generation)
        this._error(e);
    }).finally(() => {
      releaseMemory();
      m._deriveJobs.delete(job);
      this._derived.delete(promise);
    });
    this._derived.add(promise);
    return promise;
  }
  set_view(id, options) {
    return this._guard(() => {
      const m = this._model(id), previous = m._requestedView || m;
      const next = validateView(
        options.display ?? previous.display,
        options.smooth_shading ?? previous.smooth_shading
      );
      const features = viewFeatures({ ...m, ...next }), g = m.geometry;
      const needed = g && (features.smooth && !g.smoothNormals || features.wire && !g.wire || features.edges && (!g.edges || g.edgeAngle !== features.edgeAngle));
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
        const task = work.then(commit).finally(() => this._derived.delete(task));
        this._derived.add(task);
      }
    });
  }
  set_display(id, display) {
    return this.set_view(id, {
      display,
      ...display === "flat" || display === "smooth" ? { smooth_shading: display === "smooth" } : {}
    });
  }
  set_smooth(id, enabled) {
    return this._guard(() => {
      const m = this._model(id), view = m._requestedView || m;
      return this.set_view(id, {
        display: view.display === "smooth" ? "flat" : view.display,
        smooth_shading: enabled
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
        if (v !== void 0) finite(v, "position");
      });
      this._stopAnimation(m, "manual");
      [x, y, z].forEach((v, i) => {
        if (v !== void 0) m[["x", "y", "z"][i]] = finite(v, "position");
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
        if (v !== void 0) finite(v, "rotation");
      });
      this._stopAnimation(m, "manual");
      [x, y, z].forEach((v, i) => {
        const k = ["rotationx", "rotationy", "rotationz"][i];
        if (v !== void 0)
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
      this._gridAuto = !!b && size === void 0;
      if (!b) {
        this.grid = null;
        this.renderer?.setGrid(null);
      } else {
        const extent = this._bounds();
        size ??= extent ? Math.max(...sub(extent.max, extent.min)) * 1.2 || 10 : 10;
        positive(size, "grid size");
        if (!Number.isInteger(divisions) || divisions < 1 || divisions > 1e3)
          throw new Error("Grid divisions must be 1\u20131000");
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
    const aspect = (this.canvas?.clientWidth || 1) / (this.canvas?.clientHeight || 1);
    const half = Math.min(
      Math.PI / 8,
      Math.atan(Math.tan(Math.PI / 8) * aspect)
    );
    const direction = norm(sub(this.camera.position, this.camera.target));
    this.camera.target = b.center;
    this.camera.position = add(
      b.center,
      mul(
        Math.hypot(...direction) ? direction : [0, 0, 1],
        b.radius / Math.sin(half) * 1.08
      )
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
      this.options.pixel_ratio ?? Math.min(globalThis.devicePixelRatio || 1, 2)
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
      target: asObject(this.camera.target)
    };
  }
  set_camera_state(state) {
    return this._guard(() => {
      const position = state.position ? vector(state.position, "position") : this.camera.position, up = state.up ? vector(state.up, "up") : this.camera.up, target = state.target ? vector(state.target, "target") : this.camera.target;
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
        z: z ?? this.camera.position[2]
      }
    });
  }
  pick_model(clientX, clientY) {
    if (!this.ready || this.killsign || !Number.isFinite(clientX) || !Number.isFinite(clientY))
      return null;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom)
      return null;
    const vpInv = inverse(cameraMatrix(this.camera, rect.width / rect.height));
    const far = transform(vpInv, [
      (clientX - rect.left) / rect.width * 2 - 1,
      1 - (clientY - rect.top) / rect.height * 2,
      1
    ]);
    const direction = norm(sub(far, this.camera.position));
    let id = null, distance = Infinity;
    for (const m of this._models.values())
      if (m.geometry && m.opacity > 0 && m.color !== "transparent") {
        const inv = inverse(modelMatrix(m));
        const t = intersectGeometry(
          m.geometry,
          transform(inv, this.camera.position),
          transform(inv, direction, 0),
          sectionPlane(m.geometry.bounds, m.section)
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
        type
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
      const m = this._model(id), g = m.geometry;
      if (!g) return null;
      const s = m.scaleVector, key = s.join(",");
      if (options.measurements !== false && (!m._stats || m._stats.key !== key))
        m._stats = { key, ...scaledStats(g, s) };
      const factor = m.units === "inch" ? 1 / 25.4 : 1;
      return {
        name: m.filename,
        orig_filename: m.orig_filename ?? null,
        position: { x: m.x, y: m.y, z: m.z },
        dims: asObject(
          g.bounds.min.map((v, i) => (g.bounds.max[i] - v) * s[i])
        ),
        rotation: { x: m.rotationx, y: m.rotationy, z: m.rotationz },
        display: m.display,
        smooth_shading: m.smooth_shading,
        section: m.section ? { ...m.section } : null,
        color: m.color ?? (g.colors ? "#ffffff" : "#909090"),
        scale: { x: m.scalex, y: m.scaley, z: m.scalez },
        volume: options.measurements === false ? null : m._stats.volume * factor ** 3,
        area: options.measurements === false ? null : m._stats.area * factor ** 2,
        triangles: g.triangles,
        bounds: { min: [...g.bounds.min], max: [...g.bounds.max] },
        has_colors: !!g.colors,
        source_units: g.units || null,
        units: m.units,
        opacity: m.opacity,
        file_bytes: g.file_bytes ?? null
      };
    });
  }
  get_model_data(id) {
    return this._guard(() => {
      const m = this._model(id);
      if (!m.geometry) return null;
      return {
        positions: m.geometry.positions.slice(),
        colors: m.geometry.colors?.slice() ?? null
      };
    });
  }
  get_model_mesh(id) {
    return this._guard(() => {
      const m = this._model(id);
      return m.geometry ? toThreeMesh(m, this.options.three ?? globalThis.THREE) : null;
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
    const settings = exportOptions(options), signal = options.signal;
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
    } else if (ids === void 0) ids = [...this._models.keys()];
    if (!Array.isArray(ids) || ids.some((id) => !Number.isSafeInteger(id)) || new Set(ids).size !== ids.length)
      throw new Error(
        "model_ids must be an array of unique model IDs or 'selected'"
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
    const working = exportMemory(models, settings), occupied = this._occupiedMemory();
    assertMemory(this.limits, occupied + working, "export");
    this._exportBytes = (this._exportBytes || 0) + working;
    let job, cancel, callbackError;
    try {
      const snapshot = models.map((m) => {
        const source = settings.apply_transforms ? m : {
          ...m,
          center: [0, 0, 0],
          x: 0,
          y: 0,
          z: 0,
          rotationx: 0,
          rotationy: 0,
          rotationz: 0,
          scaleVector: [1, 1, 1].map(
            () => m.unitScale * (m.size_state?.unit_factor ?? 1)
          )
        };
        const matrix = modelMatrix(source), factor = settings.units === "inch" ? 1 / 25.4 : 1;
        for (let c = 0; c < 4; c++)
          for (let r = 0; r < 3; r++) matrix[c * 4 + r] *= factor;
        return {
          id: m.id,
          name: basename(m.filename),
          matrix,
          positions: m.geometry.positions.slice(),
          colors: settings.colors ? m.geometry.colors?.slice() : null,
          color: settings.colors && m.color && m.color !== "transparent" ? colorRGB(m.color) : null,
          opacity: m.color === "transparent" ? 0 : m.opacity
        };
      });
      const transfer = snapshot.flatMap((m) => [
        m.positions.buffer,
        ...m.colors ? [m.colors.buffer] : []
      ]);
      job = this._pool.run(
        {
          kind: "export",
          models: snapshot,
          options: settings,
          limits: {
            ...this.limits,
            max_memory_bytes: this.limits.max_memory_bytes - occupied
          }
        },
        (progress) => {
          try {
            options.on_progress?.(progress);
          } catch (error) {
            callbackError = error;
            job.cancel();
          }
        },
        transfer
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
        filename ?? this._model(id).filename ?? "model.stl"
      );
  }
  async export_scene(options = {}) {
    const format = String(options.format || "").toLowerCase();
    if (!["vsb", "vsj"].includes(format))
      throw new Error("Scene format must be vsb or vsj");
    if (options.force_basename !== void 0 && typeof options.force_basename !== "boolean")
      throw new Error("force_basename must be a boolean");
    if (options.on_progress !== void 0 && typeof options.on_progress !== "function")
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
        "Wait for models to finish opening before saving the scene"
      );
    const models = [...this._models.values()];
    if (!models.length) throw new Error("No models to export");
    if (models.some((m) => !m.geometry))
      throw new Error("A model has not finished loading");
    if (models.length + (format === "vsb" ? 1 : 0) > this.limits.max_archive_entries)
      throw new Error("Scene model count limit exceeded");
    const triangles = models.reduce((sum, m) => sum + m.geometry.triangles, 0);
    if (triangles > this.limits.max_triangles)
      throw new Error("Scene triangle limit exceeded");
    const scene = this.get_vsj(
      true,
      !!options.force_basename,
      format === "vsb"
    );
    const json = JSON.stringify(scene), manifestBytes = new Blob([json]).size;
    if (manifestBytes > this.limits.max_file_bytes)
      throw new Error("Scene manifest size limit exceeded");
    if (format === "vsb" && manifestBytes + models.length * 84 + triangles * 50 > this.limits.max_uncompressed_bytes)
      throw new Error("Scene archive limit exceeded");
    const working = MEMORY_OVERHEAD + json.length * 8 + (format === "vsb" ? triangles * 512 : 0);
    assertMemory(this.limits, this._occupiedMemory() + working, "scene export");
    this._exportBytes += working;
    let job, cancel, callbackError;
    try {
      const snapshot = format === "vsb" ? models.map((m, index) => ({
        id: m.id,
        triangles: m.geometry.triangles,
        positions: m.geometry.positions.slice(),
        colors: m.geometry.colors?.slice() || null,
        scale: scene.models[index].animation_state ? [1, 1, 1] : m.scaleVector,
        center: scene.models[index].animation_state ? [0, 0, 0] : [...m.center]
      })) : null;
      options.on_progress?.({
        loaded: 0,
        total: models.length,
        phase: "exporting"
      });
      checkAbort();
      let blob;
      if (format === "vsj") {
        blob = new Blob([json], { type: "application/json" });
        options.on_progress?.({
          loaded: models.length,
          total: models.length,
          phase: "complete"
        });
      } else {
        job = this._pool.run(
          {
            kind: "export-scene",
            scene,
            models: snapshot,
            limits: this.limits
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
            ...m.colors ? [m.colors.buffer] : []
          ])
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
        representation: "scene"
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
      models: []
    };
    if (this.grid) {
      data.grid = true;
      if (this.grid.infinite)
        data.infinite_grid = {
          spacing: this.grid.spacing,
          height: this.grid.height
        };
    }
    for (const m of this._models.values())
      if (m.geometry) {
        const model = {
          id: for_vsb ? -1 : m.id,
          filename: for_vsb ? `${m.id}.stl` : force_basename ? basename(m.filename) : m.filename,
          units: m.units,
          size_state: {
            ...structuredClone(sizeState(m)),
            unit_factor: for_vsb && !m._animation ? 1 : m.unitScale * (sizeState(m).unit_factor ?? 1)
          },
          ...m.display_name ? { display_name: m.display_name } : {},
          display: m.display,
          opacity: m.opacity,
          view_edges: m.view_edges,
          smooth_shading: m.smooth_shading,
          section: m.section ? { ...m.section } : null
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
          const center = this.center_models ? m.geometry.bounds.min.map(
            (v, i) => (v + m.geometry.bounds.max[i]) / 2
          ) : [0, 0, 0];
          const position = transform(modelMatrix(m), center);
          ["x", "y", "z"].forEach((axis, i) => model[axis] = position[i]);
        }
        data.models.push(model);
      }
    return as_js_obj ? data : JSON.stringify(data);
  }
  download_vsj(filename = "1.vsj") {
    download(
      new Blob([this.get_vsj()], { type: "application/json" }),
      filename
    );
  }
  get_vsb() {
    return {
      vsj: this.get_vsj(true, true, true),
      files: [...this._models.values()].filter((m) => m.geometry).map((m) => ({
        id: m.id,
        bin: m._animation ? exportSTL(m.geometry, [1, 1, 1], [0, 0, 0]) : this.get_stl_bin(m.id)
      }))
    };
  }
  async get_vsb_blob() {
    await this.when_ready;
    const scene = this.get_vsb(), job = this._pool.run(
      { kind: "zip", scene, limits: this.limits },
      null,
      scene.files.map((f) => f.bin)
    );
    return new Blob([await job], { type: "application/octet-stream" });
  }
  download_vsb(filename = "1.vsb") {
    return this.get_vsb_blob().then(
      (blob) => download(blob, /\.vsb$/i.test(filename) ? filename : `${filename}.vsb`)
    ).catch((e) => this._error(e));
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
      let scene, files, base = document.baseURI;
      if (typeof source === "string")
        base = new URL(source, document.baseURI).href;
      if (zip) {
        files = await this._pool.run({
          kind: "unzip",
          source: typeof source === "string" ? base : source,
          limits: this.limits
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
                () => {
                },
                controller.signal
              )
            )
          );
        } finally {
          this._aborters.delete(controller);
        }
      }
      if (generation !== this._generation || this.killsign) return;
      if (!scene || !Array.isArray(scene.models) || scene.models.length > this.limits.max_archive_entries)
        throw new Error("Invalid or oversized scene manifest");
      if (scene.bg_color !== void 0) this.set_bg_color(scene.bg_color);
      if (scene.center_models !== void 0)
        this.set_center_models(scene.center_models);
      if (scene.auto_rotate !== void 0)
        this.set_auto_rotate(scene.auto_rotate);
      if (scene.mouse_zoom !== void 0) this.set_mouse_zoom(scene.mouse_zoom);
      if (scene.auto_resize !== void 0)
        this.set_auto_resize(scene.auto_resize);
      if (scene.canvas_height !== void 0) {
        this.canvas_height = scene.canvas_height;
        this._setSizeStyle();
        this.do_resize();
      }
      if (scene.infinite_grid)
        this.set_infinite_grid(
          true,
          scene.infinite_grid.spacing,
          scene.infinite_grid.height
        );
      else if (scene.grid) this.set_grid(true);
      if (scene.camera_state) this._restoreCamera = scene.camera_state;
      const bookmarks = mergeBookmarks(
        this.get_camera_bookmarks(),
        scene.camera_bookmarks || []
      );
      const displayUnits = validateUnits(
        scene.display_units || this.display_units || "mm"
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
            if (typeof model.filename !== "string" || !Object.hasOwn(files, model.filename))
              throw new Error("VSB model file is missing");
            model.local_file = new File(
              [files[model.filename]],
              model.filename
            );
          } else if (model.filename)
            model.filename = new URL(model.filename, base).href;
          const id = model.id === void 0 || model.id === -1 ? this.max_model_id + 1 : model.id;
          if (this._models.has(id))
            throw new Error(`Invalid or duplicate model id: ${id}`);
          this.add_model({
            ...model,
            id,
            animation: null,
            animation_state: null
          });
          const m = this._models.get(id);
          if (!m) throw new Error(this.error || "Invalid scene model");
          m._sceneImportPending = true;
          incoming.push({ m, model, pending: this._pending.get(id) });
        }
        await Promise.all(incoming.map((item) => item.pending));
        if (generation !== this._generation || this.killsign) return;
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
    })().catch((e) => {
      if (generation === this._generation && e.name !== "AbortError")
        this._error(e);
    }).finally(() => {
      this._sceneLoads.delete(promise);
      this._finishSession();
    });
    this._sceneLoads.add(promise);
    return void 0;
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
    queueMicrotask(() => {
      this._callback("animation_state_callback", m.id, state, reason);
      if (reason === "completed")
        this._callback("animation_complete_callback", m.id, state);
    });
  }
  _animationState(m) {
    return m._animation ? playbackState(m._animation, !!this._animationSuspended) : {
      ...m._animationResult ?? { status: "idle", elapsed_ms: 0 },
      suspended: false,
      tracks: []
    };
  }
  _stopAnimation(m, reason) {
    if (!m._animation && !m.animation) return;
    m._animationResult = {
      status: "stopped",
      elapsed_ms: m._animation?.elapsed_ms ?? 0
    };
    m._animation = null;
    m.animation = null;
    delete m.animation_state;
    this._animationEvent(m, reason);
  }
  _completeAnimation(m) {
    m._animationResult = {
      status: "completed",
      elapsed_ms: m._animation.elapsed_ms
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
      false
    );
    const result = new Promise(
      (resolve, reject) => this.canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Screenshot failed")),
        type
      )
    );
    this._invalidate();
    return result;
  }
};
var viewer_default = StlViewer;

// src/memory-policy.js
var GiB = 1024 ** 3;
var MiB = 1024 ** 2;
function memoryPolicy(reportedGiB) {
  const reported = typeof reportedGiB === "number" && Number.isFinite(reportedGiB) && reportedGiB >= 0.25 && reportedGiB <= 128;
  const estimated = (reported ? reportedGiB : 2) * GiB;
  const budget = Math.floor(estimated / 2);
  return {
    budget,
    reported,
    estimated,
    limits: {
      max_memory_bytes: budget,
      max_file_bytes: Math.floor(budget / 3),
      max_triangles: Math.max(1, Math.floor((budget - 64 * MiB) / 224)),
      max_uncompressed_bytes: Math.max(1, Math.floor((budget - 64 * MiB) / 4))
    }
  };
}
async function estimateFile(file) {
  if (/\.(step|stp|iges|igs)$/i.test(file.name))
    return 128 * MiB + (file.size || 0) * 40;
  if (/\.stl$/i.test(file.name) && file.size >= 84 && file.slice) {
    const header = await file.slice(0, 84).arrayBuffer();
    const count = new DataView(header).getUint32(80, true);
    if (count && 84 + count * 50 === file.size) return 64 * MiB + count * 224;
  }
  return 64 * MiB + (file.size || 0) * 3;
}

// src/model-transform.js
var axes2 = ["x", "y", "z"];
var vector2 = (p) => axes2.map((a) => p[a]);
var object2 = (p) => Object.fromEntries(axes2.map((a, i) => [a, p[i]]));
var dot2 = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
var norm2 = (a) => {
  const n = Math.hypot(...a) || 1;
  return a.map((v) => v / n);
};
var multiply2 = (a, b) => Array.from(
  { length: 9 },
  (_, i) => [0, 1, 2].reduce(
    (sum, k) => sum + a[Math.floor(i / 3) * 3 + k] * b[k * 3 + i % 3],
    0
  )
);
var transform2 = (m, p) => [0, 1, 2].map((i) => dot2(m.slice(i * 3, i * 3 + 3), p));
function rotationMatrix(degrees = { x: 0, y: 0, z: 0 }) {
  const [x, y, z] = vector2(degrees).map((v) => v % 360 * Math.PI / 180);
  const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z);
  return [
    c * e,
    -c * f,
    d,
    a * f + b * e * d,
    a * e - b * d * f,
    -b * c,
    b * f - a * e * d,
    b * e + a * d * f,
    a * c
  ];
}
var centerOf = (bounds) => bounds.min.map((v, i) => (v + bounds.max[i]) / 2);
function modelCenter(model) {
  return object2(
    centerOf(model.bounds).map((v, i) => v + model.position[axes2[i]])
  );
}
function modelRadius(model) {
  return Math.max(
    Math.hypot(...model.bounds.max.map((v, i) => v - model.bounds.min[i])) / 2,
    1e-6
  );
}
function enginePosition(model) {
  const c = centerOf(model.bounds), rotated = transform2(rotationMatrix(model.rotation), c);
  return object2(c.map((v, i) => model.position[axes2[i]] + v - rotated[i]));
}
function modelBounds(model) {
  if (!model.rotation || !Object.values(model.rotation).some((v) => v % 360))
    return model.bounds;
  const c = centerOf(model.bounds), r = rotationMatrix(model.rotation), min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let corner = 0; corner < 8; corner++) {
    const p = transform2(
      r,
      c.map((v, i) => model.bounds[corner & 1 << i ? "max" : "min"][i] - v)
    );
    p.forEach((v, i) => {
      min[i] = Math.min(min[i], v + c[i]);
      max[i] = Math.max(max[i], v + c[i]);
    });
  }
  return { min, max };
}
function axisRotation(axis, angle) {
  const [x, y, z] = norm2(axis), c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
  return [
    t * x * x + c,
    t * x * y - s * z,
    t * x * z + s * y,
    t * x * y + s * z,
    t * y * y + c,
    t * y * z - s * x,
    t * x * z - s * y,
    t * y * z + s * x,
    t * z * z + c
  ];
}
function rotatedModel(start, basis, dx, dy, height) {
  const scale = Math.PI / Math.max(1, height);
  const r = multiply2(
    axisRotation(basis.right, dy * scale),
    multiply2(axisRotation(basis.up, dx * scale), rotationMatrix(start))
  );
  const y = Math.asin(Math.max(-1, Math.min(1, r[2]))), regular = Math.abs(Math.cos(y)) > 1e-10;
  return {
    x: (regular ? Math.atan2(-r[5], r[8]) : Math.atan2(r[7], r[4])) * 180 / Math.PI,
    y: y * 180 / Math.PI,
    z: (regular ? Math.atan2(-r[1], r[0]) : 0) * 180 / Math.PI
  };
}
function depthPosition(model, camera, amount) {
  if (amount === 0) return { ...model.position };
  const eye = vector2(camera.position), center = vector2(model.center), toward = center.map((v, i) => v - eye[i]);
  const forward = norm2(vector2(camera.target).map((v, i) => v - eye[i]));
  const distance = Math.hypot(...toward), direction = distance > 1e-9 ? toward.map((v) => v / distance) : forward;
  const clearance = Math.max(model.radius || 1e-6, 1e-6) * 1.1 / Math.max(0.05, dot2(direction, forward));
  const desired = (distance || clearance) * Math.exp(Math.max(-6, Math.min(6, amount)));
  const next = amount < 0 ? Math.max(Math.min(distance, clearance), desired) : Math.max(distance, Math.min(1e12, desired));
  return object2(
    vector2(model.position).map((v, i) => v + direction[i] * (next - distance))
  );
}

// src/scene-layout.js
function scenePlacement(models, mode) {
  if (mode === "custom")
    return models.map((m) => ({
      id: m.id,
      ...m.position || { x: 0, y: 0, z: 0 }
    }));
  if (mode === "original")
    return models.map((m) => ({
      id: m.id,
      ...m.originalPosition || { x: 0, y: 0, z: 0 }
    }));
  models = models.map((m) => ({ ...m, bounds: modelBounds(m) }));
  const widths = models.map((m) => m.bounds.max[0] - m.bounds.min[0]);
  const gap = models.reduce(
    (size, m) => Math.max(size, ...m.bounds.max.map((v, i) => v - m.bounds.min[i])),
    1
  ) * 0.12;
  let cursor = -(widths.reduce((sum, w) => sum + w, 0) + gap * Math.max(0, models.length - 1)) / 2;
  return models.map((m, i) => {
    const p = {
      id: m.id,
      x: cursor - m.bounds.min[0],
      y: -(m.bounds.min[1] + m.bounds.max[1]) / 2,
      z: -m.bounds.min[2]
    };
    cursor += widths[i] + gap;
    return p;
  });
}
function sceneFloor(models, placement) {
  const offsets = new Map(placement.map((p) => [p.id, p.z]));
  return models.length ? models.reduce(
    (z, m) => Math.min(z, modelBounds(m).min[2] + (offsets.get(m.id) || 0)),
    Infinity
  ) : 0;
}

// src/model-state.js
var axes3 = ["x", "y", "z"];
function syncAnimatedRecord(record, model) {
  if (!record || !model?.geometry) return;
  record.bounds = Object.fromEntries(
    ["min", "max"].map((key) => [
      key,
      model.geometry.bounds[key].map(
        (v, i) => (v - model.center[i]) * model.scaleVector[i]
      )
    ])
  );
  record.rotation = Object.fromEntries(
    axes3.map((a) => [a, model["rotation" + a] * 180 / Math.PI % 360])
  );
  record.position = { x: 0, y: 0, z: 0 };
  const offset = enginePosition(record);
  for (const a of axes3) record.position[a] = model[a] - offset[a];
}
function centerAnimationPivot(record, model) {
  syncAnimatedRecord(record, model);
  const center = model.geometry.bounds.min.map(
    (v, i) => (v + model.geometry.bounds.max[i]) / 2
  );
  const delta = center.map(
    (v, i) => (v - model.center[i]) * model.scaleVector[i]
  );
  const rotation2 = rotationMatrix(record.rotation);
  const original = record.originalPosition || { x: 0, y: 0, z: 0 };
  record.originalPosition = Object.fromEntries(
    axes3.map((a, i) => [a, original[a] + delta[i]])
  );
  for (let i = 0; i < 3; i++)
    model[axes3[i]] += delta.reduce(
      (sum, v, j) => sum + rotation2[i * 3 + j] * v,
      0
    );
  model.center = center;
  record.animationPivot = true;
  syncAnimatedRecord(record, model);
}

// src/model-move.js
var vector3 = (p) => [p.x, p.y, p.z];
var sub2 = (a, b) => a.map((v, i) => v - b[i]);
var dot3 = (a, b) => a.reduce((n, v, i) => n + v * b[i], 0);
var cross2 = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
var norm3 = (a) => {
  const size = Math.hypot(...a);
  return a.map((v) => v / (size || 1));
};
function moveBasis(camera, center, viewportHeight) {
  const eye = vector3(camera.position), target = vector3(camera.target);
  const back = norm3(sub2(eye, target));
  let right = norm3(cross2(vector3(camera.up), back));
  if (Math.hypot(...right) < 0.5)
    right = norm3(cross2(Math.abs(back[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], back));
  const up = cross2(back, right), depth = dot3(sub2(eye, vector3(center)), back);
  const scale = 2 * Math.max(depth, 1e-6) * Math.tan(Math.PI / 8) / Math.max(viewportHeight, 1);
  return { right, up, scale };
}
function movedPosition(start, basis, dx, dy) {
  return Object.fromEntries(
    ["x", "y", "z"].map((axis, i) => [
      axis,
      start[axis] + (basis.right[i] * dx - basis.up[i] * dy) * basis.scale
    ])
  );
}
function bindModelMove(canvas, {
  getModel,
  getCamera,
  getTool = () => "move",
  onMove,
  onRotate,
  onStart,
  onEnd
}) {
  let enabled = false, drag = null;
  const blocked = /* @__PURE__ */ new Set(), cleanup = [];
  const on = (event, handler) => {
    canvas.addEventListener(event, handler, { capture: true, passive: false });
    cleanup.push(() => canvas.removeEventListener(event, handler, true));
  };
  const stop = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  const end = (cancel = false) => {
    if (!drag) return;
    const current = drag;
    drag = null;
    if (cancel) {
      if (current.tool === "rotate") onRotate?.(current.id, current.rotation);
      else onMove(current.id, current.position);
    }
    if (canvas.hasPointerCapture(current.pointer))
      canvas.releasePointerCapture(current.pointer);
    onEnd?.(current.id, cancel);
  };
  on("pointerdown", (e) => {
    if (!enabled || e.button !== 0 || e.shiftKey) return;
    stop(e);
    if (drag || e.isPrimary === false) {
      blocked.add(e.pointerId);
      return;
    }
    const model = getModel(e);
    if (!model) return;
    drag = {
      tool: getTool(),
      rotation: { ...model.rotation || { x: 0, y: 0, z: 0 } },
      model: {
        ...model,
        position: { ...model.position },
        center: { ...model.center }
      },
      camera: getCamera(),
      height: canvas.getBoundingClientRect().height,
      id: model.id,
      position: { ...model.position },
      pointer: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      basis: moveBasis(
        getCamera(),
        model.center,
        canvas.getBoundingClientRect().height
      )
    };
    onStart?.(model.id);
    canvas.setPointerCapture(e.pointerId);
    canvas.focus({ preventScroll: true });
  });
  on("pointermove", (e) => {
    if (blocked.has(e.pointerId)) {
      stop(e);
      return;
    }
    if (!drag || drag.pointer !== e.pointerId) return;
    stop(e);
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (drag.tool === "rotate")
      onRotate?.(
        drag.id,
        rotatedModel(drag.rotation, drag.basis, dx, dy, drag.height)
      );
    else if (drag.tool === "depth")
      onMove(
        drag.id,
        depthPosition(
          drag.model,
          drag.camera,
          dy * 3 / Math.max(1, drag.height)
        )
      );
    else onMove(drag.id, movedPosition(drag.position, drag.basis, dx, dy));
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    on(event, (e) => {
      if (blocked.delete(e.pointerId)) {
        stop(e);
        return;
      }
      if (!drag || drag.pointer !== e.pointerId) return;
      stop(e);
      end(event !== "pointerup");
    });
  on("wheel", (e) => {
    if (!enabled) return;
    stop(e);
    if (drag) return;
    const model = getModel();
    if (!model) return;
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvas.getBoundingClientRect().height : 1);
    onMove(
      model.id,
      depthPosition(
        model,
        getCamera(),
        Math.max(-0.5, Math.min(0.5, delta * 15e-4))
      )
    );
  });
  for (const event of ["keydown", "dblclick"])
    on(event, (e) => {
      if (drag && e.key !== "Escape") stop(e);
    });
  return {
    setEnabled(value) {
      end(true);
      blocked.clear();
      enabled = value;
    },
    dispose() {
      end(true);
      cleanup.forEach((fn) => fn());
    }
  };
}

// src/session.js
var axes4 = ["x", "y", "z"];
var formats = /\.(stl|obj|3mf|step|stp|iges|igs|vsb|vsj)$/i;
var zero = () => ({ x: 0, y: 0, z: 0 });
var failure = (code, message) => Object.assign(new Error(message), { code });
var ViewerSession = class {
  constructor(container, options = {}) {
    if (options.viewer_options?.models)
      throw new TypeError("Use session.openFiles/openURL for initial models");
    if (options.viewer_options?.allow_drag_and_drop)
      throw new TypeError("Pass dropped files to session.openFiles");
    this._container = container;
    this._options = options;
    this._policy = memoryPolicy(options.device_memory);
    for (const key of Object.keys(this._policy.limits))
      if (options.viewer_options?.[key] !== void 0)
        this._policy.limits[key] = options.viewer_options[key];
    this._policy.budget = this._policy.limits.max_memory_bytes;
    this._records = /* @__PURE__ */ new Map();
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
    this._bindings = /* @__PURE__ */ new Set();
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
      source: source?.name
    });
  }
  async ready() {
    this._assertActive();
    if (!this._viewerPromise) {
      this._viewerPromise = Promise.resolve().then(async () => {
        this._assertActive();
        const supplied = this._options.viewer_options || {};
        const viewer = this._viewer = new StlViewer(this._container, {
          ...this._policy.limits,
          worker_count: 1,
          worker_timeout: 6e5,
          center_models: false,
          allow_drag_and_drop: false,
          ...supplied,
          loading_progress_callback: (status) => {
            if (this._busy && !this._sceneImport)
              this._emit({
                type: "progress",
                scene: false,
                progress: status[this._loadingID] || {}
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
          }
        });
        await viewer.when_ready;
        this._assertActive();
        this._emit({ type: "ready" });
        return viewer;
      }).catch((error) => {
        this._viewer?.dispose();
        this._viewer = null;
        this._viewerPromise = null;
        throw error;
      });
    }
    return this._viewerPromise;
  }
  _record(id) {
    const record = this._records.get(id), model = this._viewer?._models.get(id);
    if (!record || !model?.geometry) return null;
    syncAnimatedRecord(record, model);
    record.color = model.color || (model.geometry.colors ? null : "#909090");
    return record;
  }
  getModel(id) {
    this._assertActive();
    const r = this._record(id);
    if (!r) return null;
    const { sourceFile, estimated, ...data } = r;
    return structuredClone({
      ...data,
      animation: this._viewer.get_model_animation_state(id),
      animationDefinition: this._viewer._models.get(id)?.animation || null
    });
  }
  getModels() {
    this._assertActive();
    return [...this._records.keys()].map((id) => this.getModel(id)).filter(Boolean);
  }
  _adopt(id, source = {}, imported = false) {
    const m = this._viewer._models.get(id), g = m.geometry;
    const record = {
      id,
      name: source.name || String(m.display_name || m.orig_filename || m.filename).split(/[\\/]/).pop().split(/[?#]/)[0],
      size: source.size ?? g.file_bytes ?? m.local_file?.size ?? null,
      units: g.units || m.units || null,
      embedded: !!g.colors,
      color: m.color || (g.colors ? null : "#909090"),
      estimated: g.triangles * 224,
      sourceFile: source.sourceFile || null
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
    const p = enginePosition(record), r = record.rotation;
    this._viewer.set_rotation(
      record.id,
      ...axes4.map((a) => r[a] % 360 * Math.PI / 180)
    );
    this._viewer.set_position(record.id, p.x, p.y, p.z);
  }
  _setTransform(id, kind, value, limit) {
    this._assertActive();
    if (!this._records.has(id) || !value || !axes4.every(
      (a) => Number.isFinite(value[a]) && Math.abs(value[a]) <= limit
    ))
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
    return this._setTransform(id, "rotation", degrees, 36e4);
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
    return record ? { ...record, center: modelCenter(record), radius: modelRadius(record) } : null;
  }
  moveDepth(id, amount) {
    if (!Number.isFinite(amount))
      throw new TypeError("Depth amount must be finite");
    const model = this._manipulationModel(id);
    return model ? this.setPosition(
      id,
      depthPosition(model, this._viewer.get_camera_state(), amount)
    ) : false;
  }
  bindManipulation(options) {
    this._assertActive();
    if (!this._viewer?.ready)
      throw new Error("Await session.ready() before binding manipulation");
    let arrangement, disposed = false;
    const binding = bindModelMove(this._viewer.canvas, {
      getCamera: () => this._viewer.get_camera_state(),
      getModel: (event) => this._manipulationModel(options.getModelId(event)),
      getTool: options.getTool,
      onMove: (id, position) => {
        this.setPosition(id, position);
        options.onChange?.(id);
      },
      onRotate: (id, rotation2) => {
        this.setRotation(id, rotation2);
        options.onChange?.(id);
      },
      onStart: (id) => {
        arrangement = this._arrangement;
        options.onStart?.(id);
      },
      onEnd: (id, cancelled) => {
        if (cancelled) this._arrangement = arrangement;
        options.onEnd?.(id, cancelled);
      }
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
      }
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
    const records = [...this._records.values()], positions = scenePlacement(records, mode);
    for (const { id, x, y, z } of positions) {
      const r = this._records.get(id);
      r.position = { x, y, z };
      this._renderTransform(r);
    }
    this.setGrid(
      this._grid.enabled,
      this._grid.spacing,
      sceneFloor(records, positions)
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
          source
        );
      else if (source.size === 0)
        this._error(failure("empty-file", "The file is empty"), source);
      else accepted.push(source);
    }
    const scenes = accepted.filter((f) => sceneFormat(f.name));
    if (scenes.length) {
      const batch = {
        files: accepted.filter((f) => !sceneFormat(f.name)),
        used: /* @__PURE__ */ new Set(),
        failed: false
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
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password)
      throw new Error(
        "Use a public HTTP or HTTPS file URL without login credentials."
      );
    if (format && !/^(stl|obj|3mf|step|stp|iges|igs|vsb|vsj)$/.test(format))
      throw new Error("Unsupported model or scene format");
    url.hash = "";
    const name = decodeURIComponent(
      url.pathname.split("/").at(-1) || "Remote model"
    ).slice(0, 200);
    this._queue.push({
      name,
      remote: url.href,
      format,
      size: 0,
      scene: ["vsb", "vsj"].includes(format) ? format : sceneFormat(name)
    });
    return this._drain();
  }
  _drain() {
    if (!this._drainPromise && this._queue.length) {
      this._drainPromise = Promise.resolve().then(() => this._drainQueue());
    }
    return this._drainPromise || Promise.resolve();
  }
  async _drainQueue() {
    try {
      while (true) {
        if (!this._queue.length) {
          this._setBusy(false);
          if (!this._queue.length) break;
        }
        const source = this._queue.shift(), token = this._generation;
        if (source.remaining) {
          if (!source.remaining.failed)
            this._queue.unshift(
              ...source.remaining.files.filter(
                (f) => !source.remaining.used.has(f)
              )
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
            0
          );
          if (estimated + resident > this._policy.budget || source.size > this._policy.limits.max_file_bytes)
            throw failure(
              "memory-budget",
              "Estimated scene memory budget exceeded"
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
            ...source.remote ? { remote_url: source.remote, remote_format: source.format } : source.url ? { filename: source.url } : { local_file: source }
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
            sourceFile: typeof source.slice === "function" ? source : null
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
    const controller = this._sceneImport = new AbortController();
    try {
      const chosen = source.batch?.files || [];
      const cached = [
        ...new Set(
          [...this._records.values()].map((r) => r.sourceFile).filter(Boolean)
        )
      ];
      const companions = [
        ...chosen,
        ...source.sceneFile ? cached.filter(
          (f) => !chosen.some((s) => s.name === f.name) && cached.filter((s) => s.name === f.name).length === 1
        ) : []
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
          }
        }
      );
      if (token !== this._generation) return;
      for (const file of result.used_files) source.batch?.used.add(file);
      for (const id of result.model_ids) {
        const m = viewer._models.get(id);
        this._adopt(
          id,
          {
            sourceFile: result.used_files.includes(m.local_file) ? m.local_file : null
          },
          true
        );
      }
      this._nextID = Math.max(this._nextID, viewer.max_model_id + 1);
      this._arrangement = "custom";
      this._grid = {
        enabled: !!viewer.grid,
        spacing: viewer.grid?.spacing || 1,
        height: viewer.grid?.height || 0
      };
      this._emit({
        type: "scene-loaded",
        name: source.name,
        ids: result.model_ids
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
};
