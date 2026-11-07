const axes = ["x", "y", "z"];
const vector = (p) => axes.map((a) => p[a]);
const object = (p) => Object.fromEntries(axes.map((a, i) => [a, p[i]]));
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const norm = (a) => {
  const n = Math.hypot(...a) || 1;
  return a.map((v) => v / n);
};
const multiply = (a, b) =>
  Array.from({ length: 9 }, (_, i) =>
    [0, 1, 2].reduce(
      (sum, k) => sum + a[Math.floor(i / 3) * 3 + k] * b[k * 3 + (i % 3)],
      0,
    ),
  );
const transform = (m, p) =>
  [0, 1, 2].map((i) => dot(m.slice(i * 3, i * 3 + 3), p));

// Row-major Euler XYZ, matching the native viewer's model transform.
export function rotationMatrix(degrees = { x: 0, y: 0, z: 0 }) {
  const [x, y, z] = vector(degrees).map((v) => ((v % 360) * Math.PI) / 180);
  const a = Math.cos(x),
    b = Math.sin(x),
    c = Math.cos(y),
    d = Math.sin(y),
    e = Math.cos(z),
    f = Math.sin(z);
  return [
    c * e,
    -c * f,
    d,
    a * f + b * e * d,
    a * e - b * d * f,
    -b * c,
    b * f - a * e * d,
    b * e + a * d * f,
    a * c,
  ];
}
const centerOf = (bounds) => bounds.min.map((v, i) => (v + bounds.max[i]) / 2);
export function modelCenter(model) {
  return object(
    centerOf(model.bounds).map((v, i) => v + model.position[axes[i]]),
  );
}
export function modelRadius(model) {
  return Math.max(
    Math.hypot(...model.bounds.max.map((v, i) => v - model.bounds.min[i])) / 2,
    1e-6,
  );
}
// Compensate for the source file's origin so rotation keeps the model's center fixed.
export function enginePosition(model) {
  const c = centerOf(model.bounds),
    rotated = transform(rotationMatrix(model.rotation), c);
  return object(c.map((v, i) => model.position[axes[i]] + v - rotated[i]));
}
export function modelBounds(model) {
  if (!model.rotation || !Object.values(model.rotation).some((v) => v % 360))
    return model.bounds;
  const c = centerOf(model.bounds),
    r = rotationMatrix(model.rotation),
    min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  for (let corner = 0; corner < 8; corner++) {
    const p = transform(
      r,
      c.map((v, i) => model.bounds[corner & (1 << i) ? "max" : "min"][i] - v),
    );
    p.forEach((v, i) => {
      min[i] = Math.min(min[i], v + c[i]);
      max[i] = Math.max(max[i], v + c[i]);
    });
  }
  return { min, max };
}
function axisRotation(axis, angle) {
  const [x, y, z] = norm(axis),
    c = Math.cos(angle),
    s = Math.sin(angle),
    t = 1 - c;
  return [
    t * x * x + c,
    t * x * y - s * z,
    t * x * z + s * y,
    t * x * y + s * z,
    t * y * y + c,
    t * y * z - s * x,
    t * x * z - s * y,
    t * y * z + s * x,
    t * z * z + c,
  ];
}
export function rotatedModel(start, basis, dx, dy, height) {
  const scale = Math.PI / Math.max(1, height);
  const r = multiply(
    axisRotation(basis.right, dy * scale),
    multiply(axisRotation(basis.up, dx * scale), rotationMatrix(start)),
  );
  const y = Math.asin(Math.max(-1, Math.min(1, r[2]))),
    regular = Math.abs(Math.cos(y)) > 1e-10;
  return {
    x:
      ((regular ? Math.atan2(-r[5], r[8]) : Math.atan2(r[7], r[4])) * 180) /
      Math.PI,
    y: (y * 180) / Math.PI,
    z: ((regular ? Math.atan2(-r[1], r[0]) : 0) * 180) / Math.PI,
  };
}
// Positive amount pushes away. Moving along the eye-to-model ray holds its screen center.
export function depthPosition(model, camera, amount) {
  if (amount === 0) return { ...model.position };
  const eye = vector(camera.position),
    center = vector(model.center),
    toward = center.map((v, i) => v - eye[i]);
  const forward = norm(vector(camera.target).map((v, i) => v - eye[i]));
  const distance = Math.hypot(...toward),
    direction = distance > 1e-9 ? toward.map((v) => v / distance) : forward;
  const clearance =
    (Math.max(model.radius || 1e-6, 1e-6) * 1.1) /
    Math.max(0.05, dot(direction, forward));
  // Do not pull through the eye/near plane. Already-close models can still be pushed out.
  const desired =
    (distance || clearance) * Math.exp(Math.max(-6, Math.min(6, amount)));
  const next =
    amount < 0
      ? Math.max(Math.min(distance, clearance), desired)
      : Math.max(distance, Math.min(1e12, desired));
  return object(
    vector(model.position).map((v, i) => v + direction[i] * (next - distance)),
  );
}
