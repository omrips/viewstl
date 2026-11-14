import { enginePosition, rotationMatrix } from "./model-transform.js";
const axes = ["x", "y", "z"];

// Constant-size metadata only: no mesh scans, copies or statistics calculation.
export function syncAnimatedRecord(record, model) {
  if (!record || !model?.geometry) return;
  record.bounds = Object.fromEntries(
    ["min", "max"].map((key) => [
      key,
      model.geometry.bounds[key].map(
        (v, i) => (v - model.center[i]) * model.scaleVector[i],
      ),
    ]),
  );
  record.rotation = Object.fromEntries(
    axes.map((a) => [a, ((model["rotation" + a] * 180) / Math.PI) % 360]),
  );
  record.position = { x: 0, y: 0, z: 0 };
  const offset = enginePosition(record);
  for (const a of axes) record.position[a] = model[a] - offset[a];
}

// Move the pivot to the mesh center without moving any rendered vertex.
export function centerAnimationPivot(record, model) {
  syncAnimatedRecord(record, model);
  const center = model.geometry.bounds.min.map(
    (v, i) => (v + model.geometry.bounds.max[i]) / 2,
  );
  const delta = center.map(
    (v, i) => (v - model.center[i]) * model.scaleVector[i],
  );
  const rotation = rotationMatrix(record.rotation);
  const original = record.originalPosition || { x: 0, y: 0, z: 0 };
  record.originalPosition = Object.fromEntries(
    axes.map((a, i) => [a, original[a] + delta[i]]),
  );
  for (let i = 0; i < 3; i++)
    model[axes[i]] += delta.reduce(
      (sum, v, j) => sum + rotation[i * 3 + j] * v,
      0,
    );
  model.center = center;
  record.animationPivot = true;
  syncAnimatedRecord(record, model);
}
