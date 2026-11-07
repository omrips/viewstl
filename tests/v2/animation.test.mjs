import { test } from "node:test";
import assert from "node:assert/strict";
import { StlViewer } from "../../src/viewer.js";
import {
  animationPose,
  normalizeAnimation,
  normalizePlaybackState,
  createPlayback,
  evaluatePlayback,
  advancePlayback,
  savePlayback,
} from "../../src/animation.js";
import { validateScene } from "../../src/scene-import.js";
import { readSceneDocument } from "../../src/scene-reader.js";
import { DEFAULT_LIMITS } from "../../src/geometry.js";
import { parseGeometry } from "../../src/parser.js";
import { exportSceneArchive } from "../../src/scene-export.js";
import { exportGeometry } from "../../src/export.js";
import { binary, cubePositions } from "./fixtures.js";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
function model() {
  const m = {
    ...animationPose({}),
    id: 0,
    unitScale: 1,
    center: [0, 0, 0],
    units: "mm",
    filename: "cube.stl",
    display: "flat",
    opacity: 1,
    view_edges: false,
    geometry: {
      positions: cubePositions(),
      triangles: 12,
      bounds: { min: [-1, -1, -1], max: [1, 1, 1] },
    },
  };
  Object.defineProperty(m, "scaleVector", {
    get: () => [m.scalex, m.scaley, m.scalez].map((x) => x * m.unitScale),
  });
  return m;
}
function viewer(m = model()) {
  const v = Object.create(StlViewer.prototype);
  Object.assign(v, {
    _models: new Map([[0, m]]),
    _invalidate() {},
    _pending: new Map(),
    _sceneLoads: new Set(),
    _memoryReservations: new Map(),
    _exportBytes: 0,
    when_ready: Promise.resolve(),
    limits: DEFAULT_LIMITS,
    camera: { position: [0, 0, 20], target: [0, 0, 0], up: [0, 1, 0] },
    center_models: false,
    bg_color: "transparent",
    canvas_height: "100%",
  });
  return v;
}
test("legacy combined demo has independent durations and retires completed tracks", () => {
  const m = model(),
    v = viewer(m);
  v.animate_model(0, {
    delta: {
      rotationx: 1,
      rotationy: 1.1,
      rotationz: 1.2,
      msec: 1000,
      loop: true,
    },
    exact: { x: 1000, y: 150, z: 200, scale: 5, msec: 3000 },
  });
  v._animate(m, 0);
  v._animate(m, 1500);
  close(m.x, 500);
  close(m.scalex, 3);
  close(m.rotationz, 1.8);
  v._animate(m, 3000);
  close(m.x, 1000);
  close(m.scalex, 5);
  m.x = 2000; // Completed tracks must not keep writing even if another track loops.
  v._animate(m, 4000);
  close(m.x, 2000);
  close(m.rotationz, 4.8);
  assert.deepEqual(
    v.get_model_animation_state(0).tracks.map((t) => t.mode),
    ["delta"],
  );
});
test("timing is frame-rate independent, endpoints clamp and callbacks complete once", async () => {
  for (const times of [
    [0, 15, 45, 99, 170],
    [0, 170],
  ]) {
    const m = model(),
      v = viewer(m),
      events = [];
    v.animation_state_callback = (id, state, reason) => events.push(reason);
    v.animation_complete_callback = () => events.push("callback");
    v.animate_model(0, {
      delta: { x: 10, msec: 100 },
      exact: { rotationz: 1, scale: 2, msec: 150 },
    });
    for (const t of times) v._animate(m, t);
    assert.equal(m.x, 10);
    assert.equal(m.rotationz, 1);
    assert.equal(m.scalex, 2);
    assert.equal(v.get_model_animation_state(0).status, "completed");
    v._animate(m, 200);
    await Promise.resolve();
    assert.deepEqual(events, ["started", "completed", "callback"]);
  }
});
test("pause/resume and suspension preserve elapsed time and stopped pose", () => {
  const m = model(),
    v = viewer(m);
  v.animate_model(0, { delta: { x: 10, msec: 1000, loop: true } });
  v._animate(m, 0);
  v._animate(m, 200);
  close(m.x, 2);
  v.pause_model_animation(0);
  v._animate(m, 9000);
  close(m.x, 2);
  assert.equal(v.get_model_animation_state(0).status, "paused");
  v.resume_model_animation(0);
  v._animate(m, 10000);
  v._animate(m, 10100);
  close(m.x, 3);
  const old = globalThis.cancelAnimationFrame;
  globalThis.cancelAnimationFrame = () => {};
  try {
    v._suspendAnimations(true);
    v._animate(m, 20000);
    close(m.x, 3);
    assert.equal(v.get_model_animation_state(0).suspended, true);
    v._suspendAnimations(false);
  } finally {
    if (old) globalThis.cancelAnimationFrame = old;
    else delete globalThis.cancelAnimationFrame;
  }
  v._animate(m, 30000);
  v._animate(m, 30100);
  close(m.x, 4);
  v.animate_model(0, null);
  v._animate(m, 40000);
  close(m.x, 4);
  assert.equal(v.get_model_animation_state(0).status, "stopped");
});
test("manual transforms stop playback, replacement starts from current pose, invalid replacements preserve it", () => {
  for (const edit of [
    (v) => v.set_position(0, 20),
    (v) => v.set_rotation(0, 2),
    (v) => v.set_scale(0, 2),
    (v) => v.set_model_units(0, "inch", true),
  ]) {
    const m = model(),
      v = viewer(m);
    v.animate_model(0, { delta: { x: 10, msec: 1000, loop: true } });
    v._animate(m, 0);
    v._animate(m, 500);
    const previous = m._animation;
    assert.equal(
      v.animate_model(0, { delta: { x: 1 }, exact: { x: 2 } }),
      null,
    );
    assert.equal(m._animation, previous);
    v.animate_model(0, { delta: { x: 5, msec: 1000, loop: true } });
    v._animate(m, 500);
    v._animate(m, 1000);
    close(m.x, 7.5);
    edit(v);
    const pose = animationPose(m);
    v._animate(m, 4000);
    assert.deepEqual(animationPose(m), pose);
    assert.equal(v.get_model_animation_state(0).status, "stopped");
  }
});
test("animation inputs, snapshots and state are copied; translations retain cached geometry statistics", () => {
  const m = model(),
    v = viewer(m),
    input = { delta: { x: 10, msec: 1000, loop: true } },
    stats = { volume: 8 };
  m._stats = stats;
  const positions = m.geometry.positions;
  v.animate_model(0, input);
  input.delta.x = 900;
  v._animate(m, 0);
  v._animate(m, 500);
  close(m.x, 5);
  assert.equal(m._stats, stats);
  assert.equal(m.geometry.positions, positions);
  v.get_model_animation_state(0).tracks[0].msec = 1;
  assert.equal(v.get_model_animation_state(0).tracks[0].msec, 1000);
  v.animate_model(0, { exact: { scale: 2 } });
  v._animate(m, 500);
  v._animate(m, 800);
  assert.equal(m._stats, null);
});
test("invalid and collapsing scales fail before playback; numeric overflow stops without corrupting pose", () => {
  for (const input of [
    null,
    [],
    {},
    { delta: {} },
    { delta: { x: 1, msec: 0 } },
    { delta: { x: 1, msec: Infinity } },
    { delta: { x: NaN } },
    { delta: { x: 1, loop: 1 } },
    { exact: { scale: 0 } },
    { delta: { scale: -1, loop: true } },
    { delta: { scale: 1 }, exact: { scalex: 2 } },
  ])
    assert.throws(() => normalizeAnimation(input));
  assert.throws(
    () => createPlayback({ delta: { scale: -1 } }, model()),
    /endpoint/,
  );
  const m = model(),
    v = viewer(m);
  v.animate_model(0, { delta: { x: 1e12, msec: 1, loop: true } });
  v._animate(m, 0);
  v._animate(m, 10000);
  assert.equal(m.x, 0);
  assert.equal(v.get_model_animation_state(0).status, "stopped");
  assert.match(v.error, /result/);
});
test("scene validation retains safe playback metadata and rejects malformed states", () => {
  const m = model(),
    v = viewer(m);
  v.animate_model(0, { delta: { rotationz: 1, msec: 1000, loop: true } });
  v._animate(m, 0);
  v._animate(m, 250);
  v.pause_model_animation(0);
  const saved = v.get_vsj(true),
    validated = validateScene(saved, DEFAULT_LIMITS);
  assert.deepEqual(
    validated.models[0].animation_state,
    saved.models[0].animation_state,
  );
  for (const bad of [
    { ...saved.models[0].animation_state, version: 2 },
    { ...saved.models[0].animation_state, elapsed_ms: -1 },
    { ...saved.models[0].animation_state, origin: {} },
    { ...saved.models[0].animation_state, center: [0, 0, Infinity] },
  ])
    assert.throws(() => normalizePlaybackState(bad));
  assert.throws(() =>
    validateScene(
      {
        models: [
          {
            filename: "part.stl",
            animation_state: saved.models[0].animation_state,
          },
        ],
      },
      DEFAULT_LIMITS,
    ),
  );
});
test("VSJ and both VSB export APIs preserve unbaked geometry, units, scale, pivot and playback phase", async () => {
  const m = model(),
    v = viewer(m);
  m.geometry = await parseGeometry(
    binary(cubePositions().map((x, i) => x + (i % 3 === 0 ? 7 : 0))),
    "cube.stl",
  );
  m.center = [7, 0, 0];
  m.unitScale = 2;
  v._pool = {
    run(job, progress) {
      return Promise.resolve(
        exportSceneArchive(job.scene, job.models, job.limits, progress),
      );
    },
  };
  v.animate_model(0, {
    exact: { scale: 5, x: 10, msec: 1000 },
    delta: { rotationz: 1, msec: 1000, loop: true },
  });
  v._animate(m, 0);
  v._animate(m, 500);
  v.pause_model_animation(0);
  const before = animationPose(m),
    metadata = v.get_vsj(true).models[0];
  const archive = await v.export_scene({ format: "vsb" });
  const document = readSceneDocument(
      await archive.blob.arrayBuffer(),
      "vsb",
      DEFAULT_LIMITS,
    ),
    saved = document.scene.models[0];
  const decoded = await parseGeometry(
    document.files[saved.filename],
    saved.filename,
  );
  assert.deepEqual(decoded.positions, m.geometry.positions);
  assert.equal(saved.scalex, 6);
  assert.deepEqual(saved.animation_state.center, [7, 0, 0]);
  const legacyApi = v.get_vsb();
  assert.deepEqual(
    (await parseGeometry(legacyApi.files[0].bin, "cube.stl")).positions,
    m.geometry.positions,
  );
  assert.deepEqual(
    legacyApi.vsj.models[0].animation_state,
    saved.animation_state,
  );
  for (const entry of [metadata, saved]) {
    const restored = model();
    Object.assign(restored, animationPose(entry));
    restored.center = [...entry.animation_state.center];
    const playback = createPlayback(
      entry.animation,
      restored,
      entry.animation_state,
    );
    evaluatePlayback(playback, restored);
    assert.equal(playback.paused, true);
    close(restored.scalex, 6);
    close(restored.x, 5);
    close(restored.rotationz, 0.5);
    playback.paused = false;
    advancePlayback(playback, restored, 2000);
    advancePlayback(playback, restored, 2500);
    close(restored.scalex, 10);
    close(restored.x, 10);
    close(restored.rotationz, 1);
  }
  assert.deepEqual(animationPose(m), before);
  assert.equal(v._exportBytes, 0);
});
test("mesh export takes a stable pose while animation continues", async () => {
  const m = model(),
    v = viewer(m);
  m.geometry = await parseGeometry(binary(cubePositions()), "cube.stl");
  let snapshot;
  v._pool = {
    run(job) {
      snapshot = job.models;
      const promise = exportGeometry(job.models, job.options, job.limits);
      promise.cancel = () => {};
      return promise;
    },
  };
  v.animate_model(0, { delta: { x: 10, msec: 1000, loop: true } });
  v._animate(m, 0);
  v._animate(m, 500);
  const exported = await v.export_models({ format: "stl" });
  v._animate(m, 1000);
  const geometry = await parseGeometry(
    await exported.blob.arrayBuffer(),
    "snapshot.stl",
  );
  assert.equal(snapshot[0].matrix[12], 5);
  assert.deepEqual(geometry.bounds.min, [4, -1, -1]);
  assert.equal(m.x, 10);
});
