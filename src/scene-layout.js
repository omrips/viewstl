import { modelBounds } from "./model-transform.js";
// Presentation offsets only: source geometry and units remain untouched.
export function scenePlacement(models, mode) {
  if (mode === "custom")
    return models.map((m) => ({
      id: m.id,
      ...(m.position || { x: 0, y: 0, z: 0 }),
    }));
  if (mode === "original")
    return models.map((m) => ({
      id: m.id,
      ...(m.originalPosition || { x: 0, y: 0, z: 0 }),
    }));
  models = models.map((m) => ({ ...m, bounds: modelBounds(m) }));
  const widths = models.map((m) => m.bounds.max[0] - m.bounds.min[0]);
  const gap =
    models.reduce(
      (size, m) =>
        Math.max(size, ...m.bounds.max.map((v, i) => v - m.bounds.min[i])),
      1,
    ) * 0.12;
  let cursor =
    -(
      widths.reduce((sum, w) => sum + w, 0) +
      gap * Math.max(0, models.length - 1)
    ) / 2;
  return models.map((m, i) => {
    const p = {
      id: m.id,
      x: cursor - m.bounds.min[0],
      y: -(m.bounds.min[1] + m.bounds.max[1]) / 2,
      z: -m.bounds.min[2],
    };
    cursor += widths[i] + gap;
    return p;
  });
}
export function sceneFloor(models, placement) {
  const offsets = new Map(placement.map((p) => [p.id, p.z]));
  return models.length
    ? models.reduce(
        (z, m) => Math.min(z, modelBounds(m).min[2] + (offsets.get(m.id) || 0)),
        Infinity,
      )
    : 0;
}
