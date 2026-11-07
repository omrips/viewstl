import { rayBox, rayTriangle } from "./math.js";
import { assertMemory, MEMORY_OVERHEAD, TRIANGLE_MEMORY } from "./memory.js";
export const DEFAULT_LIMITS = Object.freeze({
  max_file_bytes: 256 * 1024 * 1024,
  max_triangles: 5_000_000,
  max_uncompressed_bytes: 256 * 1024 * 1024,
  max_archive_entries: 1024,
  max_memory_bytes: Number.MAX_SAFE_INTEGER,
});
export function limitsWith(options = {}) {
  const limits = { ...DEFAULT_LIMITS };
  for (const key of Object.keys(limits))
    if (options[key] !== undefined) {
      if (!Number.isSafeInteger(options[key]) || options[key] < 1)
        throw new Error(`Invalid ${key}`);
      limits[key] = options[key];
    }
  return limits;
}
export function colorRGB(value) {
  if (typeof value !== "string" || !/^#[\da-f]{6}$/i.test(value))
    throw new Error("Color must be #RRGGBB");
  return [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
}
export function finishGeometry(
  positions,
  colors = null,
  limits = DEFAULT_LIMITS,
) {
  if (
    !(positions instanceof Float32Array) ||
    !positions.length ||
    positions.length % 9
  )
    throw new Error("Geometry must contain complete triangles");
  if (positions.length / 9 > limits.max_triangles)
    throw new Error("Triangle limit exceeded");
  assertMemory(
    limits,
    MEMORY_OVERHEAD + (positions.length / 9) * TRIANGLE_MEMORY,
  );
  if (
    colors &&
    (!(colors instanceof Float32Array) || colors.length !== positions.length)
  )
    throw new Error("Invalid vertex colors");
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (let i = 0; i < positions.length; i++) {
    const v = positions[i],
      a = i % 3;
    if (!Number.isFinite(v)) throw new Error("Non-finite vertex coordinate");
    bounds.min[a] = Math.min(bounds.min[a], v);
    bounds.max[a] = Math.max(bounds.max[a], v);
    if (
      colors &&
      (!Number.isFinite(colors[i]) || colors[i] < 0 || colors[i] > 1)
    )
      throw new Error("Invalid vertex color");
  }
  const normals = new Float32Array(positions.length),
    blocks = new Float32Array(Math.ceil(positions.length / 9 / 64) * 6);
  let area = 0,
    volume = 0,
    degenerateTriangles = 0;
  for (let i = 0; i < positions.length; i += 9) {
    const ax = positions[i + 3] - positions[i],
      ay = positions[i + 4] - positions[i + 1],
      az = positions[i + 5] - positions[i + 2];
    const bx = positions[i + 6] - positions[i],
      by = positions[i + 7] - positions[i + 1],
      bz = positions[i + 8] - positions[i + 2];
    const nx = ay * bz - az * by,
      ny = az * bx - ax * bz,
      nz = ax * by - ay * bx,
      length = Math.hypot(nx, ny, nz);
    area += length / 2;
    volume +=
      (positions[i] * nx + positions[i + 1] * ny + positions[i + 2] * nz) / 6;
    if (!length) degenerateTriangles++;
    for (let k = 0; k < 9; k += 3) {
      normals[i + k] = nx / (length || 1);
      normals[i + k + 1] = ny / (length || 1);
      normals[i + k + 2] = nz / (length || 1);
    }
    const block = Math.floor(i / 9 / 64) * 6;
    if ((i / 9) % 64 === 0) {
      blocks.set(
        [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity],
        block,
      );
    }
    for (let k = 0; k < 9; k++) {
      const a = k % 3;
      blocks[block + a] = Math.min(blocks[block + a], positions[i + k]);
      blocks[block + 3 + a] = Math.max(blocks[block + 3 + a], positions[i + k]);
    }
  }
  if (!Number.isFinite(area) || !Number.isFinite(volume))
    throw new Error("Geometry magnitude exceeds numeric limits");
  return {
    positions,
    normals,
    colors,
    blocks,
    bounds,
    triangles: positions.length / 9,
    area,
    volume: Math.abs(volume),
    degenerateTriangles,
  };
}
export function deriveGeometry(
  p,
  { smooth = false, edges = false, wire = false, edgeAngle = 1 } = {},
) {
  const vertices = new Map(),
    ids = new Uint32Array(p.length / 3),
    points = [],
    sums = [];
  for (let i = 0; i < p.length; i += 3) {
    const key = `${p[i]},${p[i + 1]},${p[i + 2]}`;
    let id = vertices.get(key);
    if (id === undefined) {
      id = points.length;
      vertices.set(key, id);
      points.push([p[i], p[i + 1], p[i + 2]]);
      sums.push([0, 0, 0]);
    }
    ids[i / 3] = id;
  }
  const edgeMap = new Map();
  for (let i = 0; i < p.length; i += 9) {
    const ax = p[i + 3] - p[i],
      ay = p[i + 4] - p[i + 1],
      az = p[i + 5] - p[i + 2],
      bx = p[i + 6] - p[i],
      by = p[i + 7] - p[i + 1],
      bz = p[i + 8] - p[i + 2];
    const n = [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx],
      length = Math.hypot(...n) || 1;
    for (let j = 0; j < 3; j++)
      if (smooth) for (let k = 0; k < 3; k++) sums[ids[i / 3 + j]][k] += n[k];
    if (edges || wire)
      for (let j = 0; j < 3; j++) {
        const a = ids[i / 3 + j],
          b = ids[i / 3 + ((j + 1) % 3)],
          key = a < b ? `${a}:${b}` : `${b}:${a}`;
        const unit = n.map((v) => v / length),
          prev = edgeMap.get(key);
        if (!prev) edgeMap.set(key, { a, b, n: unit, count: 1, sharp: false });
        else {
          prev.count++;
          if (
            prev.n.reduce((v, x, k) => v + x * unit[k], 0) <
            Math.cos((edgeAngle * Math.PI) / 180)
          )
            prev.sharp = true;
        }
      }
  }
  const result = {};
  if (smooth) {
    result.smoothNormals = new Float32Array(p.length);
    for (let i = 0; i < ids.length; i++) {
      const n = sums[ids[i]],
        l = Math.hypot(...n) || 1;
      result.smoothNormals.set(
        n.map((v) => v / l),
        i * 3,
      );
    }
  }
  for (const [enabled, name, filter] of [
    [edges, "edges", (e) => e.count !== 2 || e.sharp],
    [wire, "wire", () => true],
  ])
    if (enabled) {
      const selected = [...edgeMap.values()].filter(filter),
        out = new Float32Array(selected.length * 6);
      selected.forEach((e, i) => {
        out.set(points[e.a], i * 6);
        out.set(points[e.b], i * 6 + 3);
      });
      result[name] = out;
      if (name === "edges") result.edgeAngle = edgeAngle;
    }
  return result;
}
export function intersectGeometry(g, origin, direction, plane = [0, 0, 0, 0]) {
  if (!rayBox(origin, direction, g.bounds.min, g.bounds.max)) return Infinity;
  let nearest = Infinity;
  for (let b = 0; b < g.blocks.length; b += 6) {
    if (
      !rayBox(
        origin,
        direction,
        g.blocks.subarray(b, b + 3),
        g.blocks.subarray(b + 3, b + 6),
      )
    )
      continue;
    const start = (b / 6) * 64 * 9,
      end = Math.min(start + 64 * 9, g.positions.length);
    for (let i = start; i < end; i += 9) {
      const t = rayTriangle(origin, direction, g.positions, i);
      if (
        t < nearest &&
        plane[3] +
          plane[0] * (origin[0] + direction[0] * t) +
          plane[1] * (origin[1] + direction[1] * t) +
          plane[2] * (origin[2] + direction[2] * t) <=
          0
      )
        nearest = t;
    }
  }
  return nearest;
}
export function scaledStats(g, s) {
  if (s[0] === s[1] && s[1] === s[2])
    return {
      area: g.area * s[0] * s[0],
      volume: g.volume * Math.abs(s[0] ** 3),
    };
  let area = 0;
  const p = g.positions;
  for (let i = 0; i < p.length; i += 9) {
    const ax = (p[i + 3] - p[i]) * s[0],
      ay = (p[i + 4] - p[i + 1]) * s[1],
      az = (p[i + 5] - p[i + 2]) * s[2];
    const bx = (p[i + 6] - p[i]) * s[0],
      by = (p[i + 7] - p[i + 1]) * s[1],
      bz = (p[i + 8] - p[i + 2]) * s[2];
    area +=
      Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx) / 2;
  }
  return { area, volume: g.volume * Math.abs(s[0] * s[1] * s[2]) };
}
export function exportSTL(g, scale = [1, 1, 1], center = [0, 0, 0]) {
  const buffer = new ArrayBuffer(84 + g.triangles * 50),
    d = new DataView(buffer),
    p = g.positions;
  new Uint8Array(buffer).set(
    new TextEncoder().encode("Binary STL by ViewSTL 2"),
  );
  d.setUint32(80, g.triangles, true);
  for (let i = 0; i < g.triangles; i++) {
    const o = 84 + i * 50,
      v = Array.from(
        { length: 9 },
        (_, k) => (p[i * 9 + k] - center[k % 3]) * scale[k % 3],
      );
    const a = [v[3] - v[0], v[4] - v[1], v[5] - v[2]],
      b = [v[6] - v[0], v[7] - v[1], v[8] - v[2]],
      n = [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
      ],
      l = Math.hypot(...n) || 1;
    for (let k = 0; k < 3; k++) d.setFloat32(o + k * 4, n[k] / l, true);
    for (let k = 0; k < 9; k++) d.setFloat32(o + 12 + k * 4, v[k], true);
    if (g.colors) {
      const c = [0, 1, 2].map((k) => Math.round(g.colors[i * 9 + k] * 31));
      d.setUint16(o + 48, 0x8000 | (c[0] << 10) | (c[1] << 5) | c[2], true);
    }
  }
  return buffer;
}
