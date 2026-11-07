// A tiny, reusable box in model space: transforms never copy the model mesh.
export function selectionFrame(bounds) {
  const padding = Math.max(
    Math.max(...bounds.max.map((v, i) => v - bounds.min[i])) * 0.015,
    ...[...bounds.min, ...bounds.max].map((v) => Math.abs(v) * 2e-7),
    1e-7,
  );
  const corner = (n) =>
    [0, 1, 2].map((i) =>
      n & (1 << i) ? bounds.max[i] + padding : bounds.min[i] - padding,
    );
  const lines = [];
  for (let n = 0; n < 8; n++)
    for (let axis = 0; axis < 3; axis++)
      if (!(n & (1 << axis)))
        lines.push(...corner(n), ...corner(n | (1 << axis)));
  return new Float32Array(lines);
}
