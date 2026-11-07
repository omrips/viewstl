export const add = (a, b) => a.map((v, i) => v + b[i]);
export const sub = (a, b) => a.map((v, i) => v - b[i]);
export const mul = (a, s) => a.map((v) => v * s);
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const norm = (a) => mul(a, 1 / (Math.hypot(...a) || 1));
export const identity = () =>
  new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
export function multiply(a, b) {
  const out = new Float64Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
}
export function transform(m, p, w = 1) {
  const d = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15] * w;
  return [0, 1, 2].map(
    (r) =>
      (m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r] * w) /
      (w && d ? d : 1),
  );
}
export function rotation(x, y, z) {
  const a = Math.cos(x),
    b = Math.sin(x),
    c = Math.cos(y),
    d = Math.sin(y),
    e = Math.cos(z),
    f = Math.sin(z);
  // Euler XYZ, matching the legacy mesh's rotation order (column-major).
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
    1,
  ]);
}
export function modelMatrix(m) {
  const r = rotation(m.rotationx, m.rotationy, m.rotationz),
    s = m.scaleVector;
  for (let c = 0; c < 3; c++) for (let i = 0; i < 3; i++) r[c * 4 + i] *= s[c];
  const center = m.center || [0, 0, 0];
  for (let i = 0; i < 3; i++)
    r[12 + i] =
      [m.x, m.y, m.z][i] -
      r[i] * center[0] -
      r[4 + i] * center[1] -
      r[8 + i] * center[2];
  return r;
}
export function inverse(m) {
  const a = Array.from({ length: 4 }, (_, r) => [
    ...Array.from({ length: 4 }, (_, c) => m[c * 4 + r]),
    ...Array.from({ length: 4 }, (_, c) => +(c === r)),
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
    Array.from({ length: 16 }, (_, i) => a[i % 4][4 + Math.floor(i / 4)]),
  );
}
export function cameraMatrix(camera, aspect) {
  const z = norm(sub(camera.position, camera.target));
  let x = norm(cross(camera.up, z));
  if (Math.hypot(...x) < 0.5)
    x = norm(cross(Math.abs(z[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], z));
  const y = cross(z, x),
    eye = camera.position;
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
    1,
  ]);
  const f = 1 / Math.tan(Math.PI / 8),
    n = camera.near,
    far = camera.far;
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
    (2 * far * n) / (n - far),
    0,
  ]);
  return multiply(projection, view);
}
export function rotateAxis(v, axis, angle) {
  const n = norm(axis),
    c = Math.cos(angle),
    s = Math.sin(angle);
  return add(add(mul(v, c), mul(cross(n, v), s)), mul(n, dot(n, v) * (1 - c)));
}
export function rayBox(origin, direction, min, max) {
  let near = 0,
    far = Infinity;
  for (let a = 0; a < 3; a++) {
    if (Math.abs(direction[a]) < 1e-15) {
      if (origin[a] < min[a] || origin[a] > max[a]) return false;
      continue;
    }
    let x = (min[a] - origin[a]) / direction[a],
      y = (max[a] - origin[a]) / direction[a];
    if (x > y) [x, y] = [y, x];
    near = Math.max(near, x);
    far = Math.min(far, y);
    if (far < near) return false;
  }
  return true;
}
export function rayTriangle(o, d, p, i) {
  const a = [p[i], p[i + 1], p[i + 2]],
    b = sub([p[i + 3], p[i + 4], p[i + 5]], a),
    c = sub([p[i + 6], p[i + 7], p[i + 8]], a);
  const h = cross(d, c),
    det = dot(b, h);
  if (Math.abs(det) < 1e-12) return Infinity;
  const s = sub(o, a),
    u = dot(s, h) / det;
  if (u < 0 || u > 1) return Infinity;
  const q = cross(s, b),
    v = dot(d, q) / det;
  if (v < 0 || u + v > 1) return Infinity;
  const t = dot(c, q) / det;
  return t >= 0 ? t : Infinity;
}
