// Bounded, native-JavaScript spatial queries. Tolerance cases are reported, never repaired.
export const sub = (a, b) => a.map((v, i) => v - b[i]);
export const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export function triangleAt(p, i) {
  return [0, 3, 6].map((k) => Array.from(p.subarray(i * 9 + k, i * 9 + k + 3)));
}
export function makeTree(p, tick) {
  const count = p.length / 9,
    boxes = new Float64Array(count * 6);
  for (let i = 0; i < count; i++) {
    if (i % 1024 === 0) tick();
    for (let a = 0; a < 3; a++) {
      boxes[i * 6 + a] = Math.min(
        p[i * 9 + a],
        p[i * 9 + 3 + a],
        p[i * 9 + 6 + a],
      );
      boxes[i * 6 + a + 3] = Math.max(
        p[i * 9 + a],
        p[i * 9 + 3 + a],
        p[i * 9 + 6 + a],
      );
    }
  }
  const ids = Uint32Array.from({ length: count }, (_, i) => i);
  const build = (start, end) => {
    tick();
    const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let j = start; j < end; j++)
      for (let a = 0; a < 3; a++) {
        b[a] = Math.min(b[a], boxes[ids[j] * 6 + a]);
        b[a + 3] = Math.max(b[a + 3], boxes[ids[j] * 6 + a + 3]);
      }
    const node = { b, start, end };
    if (end - start > 16) {
      const extent = [0, 1, 2].map((a) => b[a + 3] - b[a]),
        axis = extent.indexOf(Math.max(...extent));
      ids
        .subarray(start, end)
        .sort(
          (a, c) =>
            boxes[a * 6 + axis] +
            boxes[a * 6 + axis + 3] -
            (boxes[c * 6 + axis] + boxes[c * 6 + axis + 3]),
        );
      const mid = (start + end) >>> 1;
      node.left = build(start, mid);
      node.right = build(mid, end);
    }
    return node;
  };
  return { root: build(0, count), ids, boxes };
}
const overlap = (a, b, e) =>
  [0, 1, 2].every((k) => a[k] <= b[k + 3] + e && a[k + 3] + e >= b[k]);
export function visitPairs(tree, eps, visit, tick) {
  const walk = (a, b, same) => {
    tick();
    if (!overlap(a.b, b.b, eps)) return;
    if (!a.left && !b.left) {
      for (let i = a.start; i < a.end; i++)
        for (let j = b.start; j < b.end; j++) {
          const x = tree.ids[i],
            y = tree.ids[j];
          if (same && x >= y) continue;
          if (
            overlap(
              tree.boxes.subarray(x * 6, x * 6 + 6),
              tree.boxes.subarray(y * 6, y * 6 + 6),
              eps,
            )
          )
            visit(x, y);
        }
    } else if (same) {
      walk(a.left, a.left, true);
      walk(a.left, a.right, false);
      walk(a.right, a.right, true);
    } else if (a.left && (!b.left || a.end - a.start >= b.end - b.start)) {
      walk(a.left, b, false);
      walk(a.right, b, false);
    } else {
      walk(a, b.left, false);
      walk(a, b.right, false);
    }
  };
  walk(tree.root, tree.root, true);
}
const orient = (a, b, c) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
export function trianglesIntersect(a, b, shared, eps) {
  const na = cross(sub(a[1], a[0]), sub(a[2], a[0])),
    nb = cross(sub(b[1], b[0]), sub(b[2], b[0]));
  const la = Math.hypot(...na),
    lb = Math.hypot(...nb);
  if (!la || !lb) return 0;
  const da = b.map((p) => dot(sub(p, a[0]), na) / la),
    db = a.map((p) => dot(sub(p, b[0]), nb) / lb);
  if ([da, db].some((d) => d.every((v) => v > eps) || d.every((v) => v < -eps)))
    return 0;
  const line = cross(
    na.map((v) => v / la),
    nb.map((v) => v / lb),
  );
  if (Math.hypot(...line) < 1e-10) {
    if (Math.max(...da.map(Math.abs)) > eps) return 0;
    const axis = na.map(Math.abs).indexOf(Math.max(...na.map(Math.abs))),
      project = (p) => p.filter((_, k) => k !== axis);
    if (shared >= 2) {
      const same = (p, q) => p.every((v, k) => v === q[k]);
      const common = a.filter((p) => b.some((q) => same(p, q)));
      if (common.length === 3) return 1;
      if (common.length === 2) {
        const otherA = a.find((p) => !common.some((q) => same(p, q)));
        const otherB = b.find((p) => !common.some((q) => same(p, q)));
        return orient(project(common[0]), project(common[1]), project(otherA)) *
          orient(project(common[0]), project(common[1]), project(otherB)) >
          0
          ? 1
          : 0;
      }
    }
    let polygon = a.map(project);
    const clip = b.map(project),
      sign = Math.sign(orient(...clip));
    for (let k = 0; k < 3 && polygon.length; k++) {
      const u = clip[k],
        v = clip[(k + 1) % 3],
        out = [];
      for (let j = 0; j < polygon.length; j++) {
        const s = polygon[j],
          t = polygon[(j + 1) % polygon.length],
          ds = sign * orient(u, v, s),
          dt = sign * orient(u, v, t);
        if (ds >= 0) out.push(s);
        if (ds >= 0 !== dt >= 0) {
          const f = ds / (ds - dt);
          out.push(s.map((x, i) => x + (t[i] - x) * f));
        }
      }
      polygon = out;
    }
    const area =
      Math.abs(
        polygon.reduce((s, p, i) => {
          const q = polygon[(i + 1) % polygon.length];
          const o = polygon[0];
          return (
            s + (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0])
          );
        }, 0),
      ) / 2;
    return area > eps * eps * 4 ? 1 : 0;
  }
  if (shared >= 2) return 0; // Non-coplanar neighboring faces meet only at their shared edge.
  const direction = line.map((v) => v / Math.hypot(...line));
  const interval = (tri, d) => {
    const hits = [];
    for (let k = 0; k < 3; k++) {
      if (Math.abs(d[k]) <= eps) hits.push(dot(tri[k], direction));
      const j = (k + 1) % 3;
      if (d[k] * d[j] < 0) {
        const f = d[k] / (d[k] - d[j]);
        hits.push(
          dot(
            tri[k].map((v, i) => v + (tri[j][i] - v) * f),
            direction,
          ),
        );
      }
    }
    return hits.length ? [Math.min(...hits), Math.max(...hits)] : null;
  };
  const x = interval(a, db),
    y = interval(b, da);
  if (!x || !y) return 0;
  const length = Math.min(x[1], y[1]) - Math.max(x[0], y[0]);
  return length > eps ? 1 : shared ? 0 : length >= -eps ? 2 : 0;
}
export function rayHit(o, d, tri, eps) {
  const e1 = sub(tri[1], tri[0]),
    e2 = sub(tri[2], tri[0]),
    h = cross(d, e2),
    det = dot(e1, h);
  if (Math.abs(det) <= Math.hypot(...e1) * Math.hypot(...e2) * 1e-12)
    return null;
  const s = sub(o, tri[0]),
    u = dot(s, h) / det,
    q = cross(s, e1),
    v = dot(d, q) / det,
    t = dot(e2, q) / det;
  if (u < -1e-10 || v < -1e-10 || u + v > 1 + 1e-10 || t <= eps) return null;
  return { t, edge: Math.min(u, v, 1 - u - v) < 1e-8 };
}
function rayBox(o, d, b, eps) {
  let lo = 0,
    hi = Infinity;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(d[k]) < 1e-15) {
      if (o[k] < b[k] - eps || o[k] > b[k + 3] + eps) return false;
    } else {
      const x = (b[k] - eps - o[k]) / d[k],
        y = (b[k + 3] + eps - o[k]) / d[k];
      lo = Math.max(lo, Math.min(x, y));
      hi = Math.min(hi, Math.max(x, y));
      if (lo > hi) return false;
    }
  }
  return true;
}
export function rayQuery(tree, p, o, d, eps, accept, tick) {
  const hits = [];
  const walk = (node) => {
    tick();
    if (!rayBox(o, d, node.b, eps)) return;
    if (node.left) {
      walk(node.left);
      walk(node.right);
    } else
      for (let j = node.start; j < node.end; j++) {
        const id = tree.ids[j];
        if (!accept(id)) continue;
        const h = rayHit(o, d, triangleAt(p, id), eps);
        if (h) hits.push({ ...h, id });
      }
  };
  walk(tree.root);
  return hits;
}
