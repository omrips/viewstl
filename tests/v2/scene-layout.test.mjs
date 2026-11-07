import { test } from "node:test";
import assert from "node:assert/strict";
import { scenePlacement, sceneFloor } from "../../src/scene-layout.js";
const models = [
  { id: 1, bounds: { min: [100, 20, -7], max: [110, 50, 3] } },
  { id: 2, bounds: { min: [-50, -4, 10], max: [-30, 6, 50] } },
];
test("original placement preserves separated source origins and exact restore offsets", () => {
  assert.deepEqual(scenePlacement(models, "original"), [
    { id: 1, x: 0, y: 0, z: 0 },
    { id: 2, x: 0, y: 0, z: 0 },
  ]);
  assert.equal(sceneFloor(models, scenePlacement(models, "original")), -7);
});
test("side by side separates bounding boxes without resizing geometry, on a shared floor", () => {
  const before = JSON.stringify(models),
    p = scenePlacement(models, "side-by-side");
  assert.ok(
    models[0].bounds.max[0] + p[0].x < models[1].bounds.min[0] + p[1].x,
  );
  assert.equal(models[0].bounds.min[2] + p[0].z, 0);
  assert.equal(models[1].bounds.min[2] + p[1].z, 0);
  assert.equal(sceneFloor(models, p), 0);
  assert.equal(sceneFloor([], []), 0);
  assert.equal(JSON.stringify(models), before);
});

test("custom offsets survive adding or removing models and do not mutate source bounds", () => {
  const a = { ...models[0], position: { x: 23, y: -15.5, z: 8 } },
    b = { ...models[1], position: { x: 6, y: 2, z: -2 } },
    before = JSON.stringify([a, b]);
  assert.deepEqual(scenePlacement([a, b], "custom"), [
    { id: a.id, ...a.position },
    { id: b.id, ...b.position },
  ]);
  assert.deepEqual(
    scenePlacement([a, b, { id: 3, bounds: models[0].bounds }], "custom").slice(
      0,
      2,
    ),
    scenePlacement([a, b], "custom"),
  );
  assert.deepEqual(scenePlacement([b], "custom"), [
    { id: b.id, ...b.position },
  ]);
  assert.equal(JSON.stringify([a, b]), before);
  assert.deepEqual(scenePlacement([a, b], "original"), [
    { id: 1, x: 0, y: 0, z: 0 },
    { id: 2, x: 0, y: 0, z: 0 },
  ]);
});
