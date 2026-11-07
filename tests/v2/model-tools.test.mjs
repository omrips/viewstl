import { exportGeometry } from "../../src/export.js";
import { parseSTL } from "../../src/parser.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { StlViewer } from "../../src/viewer.js";
import { Renderer } from "../../src/renderer.js";
import { finishGeometry, DEFAULT_LIMITS } from "../../src/geometry.js";
import { cubePositions } from "./fixtures.js";
import { modelMatrix, transform } from "../../src/math.js";
import { validateScene } from "../../src/scene-import.js";
import { mergeBookmarks } from "../../src/model-tools.js";
import { measure } from "../../src/measure.js";
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
function fixture() {
  const positions = cubePositions().map((v, i) => v * 5 + [20, 30, 40][i % 3]);
  const m = {
    id: 0,
    filename: "cube.stl",
    units: "mm",
    x: 10,
    y: 20,
    z: 30,
    rotationx: 0.2,
    rotationy: 0.3,
    rotationz: 0.5,
    scalex: 1,
    scaley: 1,
    scalez: 1,
    unitScale: 1,
    center: [0, 0, 0],
    opacity: 1,
    display: "flat",
    geometry: finishGeometry(positions, null, DEFAULT_LIMITS),
  };
  Object.defineProperty(m, "scaleVector", {
    get: () => [m.scalex, m.scaley, m.scalez].map((v) => v * m.unitScale),
  });
  const v = Object.assign(Object.create(StlViewer.prototype), {
    _models: new Map([[0, m]]),
    models: [m],
    models_ref: { 0: 0 },
    max_model_id: 0,
    _invalidate() {},
    limits: DEFAULT_LIMITS,
    _memoryReservations: new Map(),
    _pending: new Map(),
    _sceneLoads: new Set(),
    _derived: new Set(),
    _aborters: new Set(),
    _jobs: new Map(),
    load_status: {},
    when_ready: Promise.resolve(),
    camera: { position: [10, -10, 10], target: [0, 0, 0], up: [0, 0, 1] },
    center_models: false,
    bg_color: "transparent",
  });
  return { v, m };
}
test("resizing keeps the off-center rotated world center fixed and rejects invalid changes atomically", () => {
  const { v, m } = fixture(),
    before = transform(modelMatrix(m), [20, 30, 40]);
  v.animate_model(0, { delta: { rotationz: 1, msec: 1000, loop: true } });
  v.resize_model(0, [2, 3, 4]);
  transform(modelMatrix(m), [20, 30, 40]).forEach((n, i) =>
    close(n, before[i]),
  );
  assert.deepEqual(v.get_model_size(0).dimensions_mm, [20, 30, 40]);
  assert.equal(v.get_model_animation_state(0).status, "stopped");
  const snapshot = [m.x, m.scalex];
  assert.throws(() => v.resize_model(0, [2, 0, 2]));
  assert.deepEqual([m.x, m.scalex], snapshot);
});
test("file correction is separate from display units and reset size retains corrected units", () => {
  const { v, m } = fixture();
  v.resize_model(0, [2, 3, 4]);
  v.set_file_units(0, "inch");
  close(v.get_model_size(0).dimensions_mm[0], 508);
  v.set_display_units("inch");
  close(m.scalex, 50.8);
  v.reset_model_size(0);
  v.get_model_size(0).dimensions_mm.forEach((n) => close(n, 254));
  v.set_file_units(0, "mm");
  v.get_model_size(0).dimensions_mm.forEach((n) => close(n, 10));
  m.size_state = null;
  m.geometry.units = "mm";
  assert.throws(() => v.set_file_units(0, "inch"), /explicit file units/);
});
test("duplicate preserves source references, pose and paused playback while sharing immutable arrays", () => {
  const { v, m } = fixture();
  v.animate_model(0, { delta: { rotationz: 1, msec: 1000, loop: true } });
  v._animate(m, 0);
  v._animate(m, 300);
  const id = v.duplicate_model(0),
    c = v._models.get(id);
  assert.equal(c.geometry.positions, m.geometry.positions);
  assert.notEqual(c.geometry, m.geometry);
  assert.equal(c.filename, m.filename);
  assert.match(c.display_name, /copy/);
  assert.equal(v.get_model_animation_state(id).status, "paused");
  assert.equal(v.get_model_animation_state(0).status, "running");
  v.resize_model(id, [2, 2, 2]);
  close(m.scalex, 1);
  close(c.scalex, 2);
  v.remove_model(0);
  assert.equal(v._models.get(id), c);
  assert.equal(c.geometry.positions.length, 108);
});
test("duplicate checks scene memory and model limits before adding anything", () => {
  const { v } = fixture();
  v.limits = { ...DEFAULT_LIMITS, max_archive_entries: 1 };
  assert.throws(() => v.duplicate_model(0), /limit/);
  assert.equal(v._models.size, 1);
  v.limits = { ...DEFAULT_LIMITS, max_memory_bytes: 1 };
  assert.throws(() => v.duplicate_model(0), /memory/i);
});
test("shared GPU buffers survive removal of one model and free exactly once", () => {
  const { m } = fixture(),
    r = Object.create(Renderer.prototype),
    freed = [];
  Object.assign(r, {
    resources: new Map(),
    sharedResources: new WeakMap(),
    upload() {
      return { buffers: [1, 2], vao: 3 };
    },
    free(x) {
      freed.push(x);
    },
  });
  const c = { geometry: { ...m.geometry } },
    a = r.resource(m, "flat"),
    b = r.resource(c, "flat");
  assert.equal(a, b);
  assert.equal(r.liveBuffers, 2);
  r.remove(m);
  assert.equal(freed.length, 0);
  assert.equal(r.resource(c, "flat"), b);
  r.remove(c);
  assert.equal(freed.length, 1);
  assert.equal(r.liveBuffers, 0);
});
test("camera presets use Z up, fit without changing models; bookmarks copy, merge and validate", () => {
  const { v, m } = fixture();
  const before = modelMatrix(m);
  for (const name of [
    "front",
    "back",
    "left",
    "right",
    "top",
    "bottom",
    "isometric",
  ]) {
    v.set_camera_view(name);
    assert.ok(v.camera.position.every(Number.isFinite));
    assert.deepEqual(modelMatrix(m), before);
  }
  v.set_camera_bookmarks([{ name: "Detail", camera: v.get_camera_state() }]);
  const copy = v.get_camera_bookmarks();
  copy[0].camera.position.x = 999;
  assert.notEqual(v.get_camera_bookmarks()[0].camera.position.x, 999);
  assert.deepEqual(
    mergeBookmarks(v.get_camera_bookmarks(), v.get_camera_bookmarks()).map(
      (b) => b.name,
    ),
    ["Detail", "Detail (2)"],
  );
  assert.throws(() =>
    v.set_camera_bookmarks([
      {
        name: "x",
        camera: {
          position: { x: 0, y: 0, z: 0 },
          target: { x: 0, y: 0, z: 0 },
          up: { x: 0, y: 0, z: 1 },
        },
      },
    ]),
  );
});
test("VSJ/VSB manifests retain baseline, file/display units, names and bookmarks without applying units twice", () => {
  const { v } = fixture();
  v.set_file_units(0, "inch");
  v.resize_model(0, [2, 3, 4]);
  v.set_display_units("inch");
  v.set_camera_bookmarks([{ name: "Top", camera: v.get_camera_state() }]);
  v.duplicate_model(0);
  for (const vsb of [false, true]) {
    const scene = validateScene(v.get_vsj(true, false, vsb), DEFAULT_LIMITS);
    assert.equal(scene.display_units, "inch");
    assert.equal(scene.camera_bookmarks[0].name, "Top");
    assert.equal(scene.models[0].size_state.file_units, "inch");
    close(scene.models[0].size_state.baseline_mm[0], 254);
    assert.match(scene.models[1].display_name, /copy/);
    if (!vsb) close(scene.models[0].scalex, 50.8);
  }
});
test("worker measurements distinguish nonuniform surface area and validated volume from open meshes", () => {
  const { m } = fixture();
  const task = {
    positions: m.geometry.positions,
    scale: [2, 3, 4],
    area: m.geometry.area,
    limits: DEFAULT_LIMITS,
    max_time_ms: 30000,
  };
  const result = measure(task);
  close(result.area_mm2, 5200);
  close(result.volume_mm3, 24000);
  assert.equal(result.volume_valid, true);
  const open = measure({
    ...task,
    positions: task.positions.slice(9),
    area: 0,
  });
  assert.equal(open.volume_valid, false);
  assert.equal(open.volume_mm3, null);
});
test("measurement cache ignores rigid motion, invalidates size and releases memory on worker failure", async () => {
  const { v, m } = fixture();
  let calls = 0;
  v._pool = {
    run(task) {
      calls++;
      return Promise.resolve(measure(task));
    },
  };
  const a = await v.measure_model(0);
  m.x += 100;
  m.rotationy += 1;
  assert.deepEqual(await v.measure_model(0), a);
  assert.equal(calls, 1);
  v.resize_model(0, [2, 2, 2]);
  close((await v.measure_model(0)).volume_mm3, 8000);
  assert.equal(calls, 1);
  v.resize_model(0, [2, 3, 2]);
  v._pool.run = () => {
    throw Error("worker unavailable");
  };
  await assert.rejects(v.measure_model(0), /unavailable/);
  assert.equal(v._memoryReservations.size, 0);
});

test("untransformed mesh export retains explicit file-unit correction but omits resizing", async () => {
  const { v } = fixture();
  v.set_file_units(0, "inch");
  v.resize_model(0, [2, 3, 4]);
  v._pool = {
    run(task) {
      return exportGeometry(task.models, task.options, task.limits, () => {});
    },
  };
  const saved = await v.export_models({
    format: "stl",
    model_ids: [0],
    apply_transforms: false,
  });
  const mesh = parseSTL(await saved.blob.arrayBuffer());
  close(mesh.bounds.max[0] - mesh.bounds.min[0], 254);
});
