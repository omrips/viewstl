import test from "node:test";
import assert from "node:assert/strict";
import {
  rotationMatrix,
  enginePosition,
  modelCenter,
  modelRadius,
  modelBounds,
  rotatedModel,
  depthPosition,
} from "../../src/model-transform.js";
import { scenePlacement, sceneFloor } from "../../src/scene-layout.js";
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const values = (p) => ["x", "y", "z"].map((a) => p[a]);
const model = {
  id: 1,
  bounds: { min: [10, -4, 20], max: [14, 2, 30] },
  position: { x: 7, y: 8, z: 9 },
  rotation: { x: 30, y: 55, z: 80 },
};
test("Rotation about an offset mesh center preserves its world center and source geometry", () => {
  const before = JSON.stringify(model),
    r = rotationMatrix(model.rotation),
    p = values(enginePosition(model)),
    c = [12, -1, 25],
    world = values(modelCenter(model));
  for (let i = 0; i < 3; i++)
    near(
      r.slice(i * 3, i * 3 + 3).reduce((s, v, j) => s + v * c[j], p[i]),
      world[i],
    );
  assert.equal(JSON.stringify(model), before);
  near(modelRadius(model), Math.sqrt(152) / 2);
});
test("Rotated bounds drive side-by-side spacing and floor placement", () => {
  const a = { ...model, rotation: { x: 0, y: 0, z: 90 } },
    b = { ...model, id: 2, rotation: { x: 90, y: 0, z: 0 } },
    bounds = modelBounds(a);
  bounds.min.forEach((v, i) => near(v, [9, -3, 20][i]));
  bounds.max.forEach((v, i) => near(v, [15, 1, 30][i]));
  const placed = scenePlacement([a, b], "side-by-side");
  assert.ok(
    modelBounds(a).max[0] + placed[0].x < modelBounds(b).min[0] + placed[1].x,
  );
  near(sceneFloor([a, b], placed), 0);
});
test("Drag rotation remains orthogonal and survives gimbal-lock angles", () => {
  const basis = { right: [1, 0, 0], up: [0, 1, 0] };
  for (const y of [-90, -89.99, 0, 89.99, 90]) {
    const start = { x: 31, y, z: 48 },
      r = rotationMatrix(start),
      unchanged = rotationMatrix(rotatedModel(start, basis, 0, 0, 500));
    r.forEach((v, i) => near(v, unchanged[i]));
    const result = rotationMatrix(rotatedModel(start, basis, 125, -63, 500));
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        near(
          result
            .slice(i * 3, i * 3 + 3)
            .reduce((s, v, k) => s + v * result[j * 3 + k], 0),
          i === j ? 1 : 0,
        );
  }
  const quarter = rotatedModel({ x: 0, y: 0, z: 0 }, basis, 250, 0, 500);
  near(quarter.y, 90);
});
test("Depth keeps the eye-to-model ray, affects only translation, and stops before the eye", () => {
  const camera = {
      position: { x: 0, y: 0, z: 100 },
      target: { x: 0, y: 0, z: 0 },
    },
    m = {
      position: { x: 0, y: 0, z: 0 },
      center: { x: 20, y: 0, z: 0 },
      radius: 4,
    };
  const before = JSON.stringify({ camera, m });
  for (const amount of [-0.3, 0.3]) {
    const p = depthPosition(m, camera, amount);
    near((20 + p.x) / (p.z - 100), 20 / -100);
    assert.equal(p.z > 0, amount < 0);
  }
  const close = depthPosition(m, camera, -6);
  near(100 - close.z, 4.4);
  assert.equal(JSON.stringify({ camera, m }), before);
  const atEye = { ...m, center: { ...camera.position } };
  assert.deepEqual(depthPosition(atEye, camera, 0), m.position);
  assert.ok(
    Object.values(depthPosition(atEye, camera, 0.1)).every(Number.isFinite),
  );
});
