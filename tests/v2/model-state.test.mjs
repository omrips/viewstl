import test from "node:test";
import assert from "node:assert/strict";
import { StlViewer } from "../../src/viewer.js";
import {
  syncAnimatedRecord,
  centerAnimationPivot,
} from "../../src/model-state.js";
import { enginePosition, rotationMatrix } from "../../src/model-transform.js";
const axes = ["x", "y", "z"];
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
function model() {
  return {
    x: 7,
    y: 8,
    z: 9,
    rotationx: 0.3,
    rotationy: -0.6,
    rotationz: 0.9,
    center: [2, -3, 1],
    scaleVector: [2, 3, 4],
    geometry: { bounds: { min: [10, 2, 20], max: [18, 8, 30] } },
  };
}
function point(m, v) {
  const r = rotationMatrix(
    Object.fromEntries(
      axes.map((a) => [a, (m["rotation" + a] * 180) / Math.PI]),
    ),
  );
  return axes.map(
    (a, i) =>
      m[a] +
      v.reduce(
        (sum, n, j) =>
          sum + r[i * 3 + j] * (n - m.center[j]) * m.scaleVector[j],
        0,
      ),
  );
}
test("model transform round trip preserves offset, rotated, nonuniformly scaled models", () => {
  const m = model(),
    record = {};
  syncAnimatedRecord(record, m);
  const p = enginePosition(record);
  for (const a of axes) near(p[a], m[a]);
  m.rotationz += 2;
  m.x += 4;
  m.scaleVector = [5, 6, 7];
  syncAnimatedRecord(record, m);
  const p2 = enginePosition(record);
  for (const a of axes) near(p2[a], m[a]);
});
test("spin pivot rebasing preserves every world vertex and reset center; repeat is idempotent", () => {
  const m = model(),
    record = { originalPosition: { x: 1, y: 2, z: 3 } };
  const vertices = [
      [10, 2, 20],
      [18, 8, 30],
      [12, 5, 23],
    ],
    before = vertices.map((v) => point(m, v)),
    g = m.geometry;
  syncAnimatedRecord(record, m);
  const originalCenter = axes.map(
    (a, i) =>
      record.originalPosition[a] +
      (record.bounds.min[i] + record.bounds.max[i]) / 2,
  );
  centerAnimationPivot(record, m);
  vertices.forEach((v, i) =>
    point(m, v).forEach((n, j) => near(n, before[i][j])),
  );
  axes.forEach((a, i) => near(record.originalPosition[a], originalCenter[i]));
  const snapshot = JSON.stringify([record, m]);
  centerAnimationPivot(record, m);
  assert.equal(JSON.stringify([record, m]), snapshot);
  assert.equal(m.geometry, g);
});

test("stopped off-center spin saves an equivalent VSJ pose using the original mesh", () => {
  const m = model(),
    record = {};
  Object.assign(m, {
    id: 0,
    filename: "offset.stl",
    scalex: 2,
    scaley: 3,
    scalez: 4,
    unitScale: 1,
  });
  centerAnimationPivot(record, m);
  const viewer = Object.create(StlViewer.prototype);
  Object.assign(viewer, {
    _models: new Map([[0, m]]),
    center_models: false,
    get_camera_state: () => ({}),
  });
  for (const centered of [false, true]) {
    viewer.center_models = centered;
    const saved = viewer.get_vsj(true).models[0];
    const restored = {
      ...m,
      ...saved,
      center: centered ? [14, 5, 25] : [0, 0, 0],
    };
    const vertex = [18, 8, 30];
    point(m, vertex).forEach((v, i) => near(v, point(restored, vertex)[i]));
    assert.equal(saved.animation, undefined);
  }
});
