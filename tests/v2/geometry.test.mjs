import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { parseSTL, parseOBJ } from "../../src/parser.js";
import {
  finishGeometry,
  deriveGeometry,
  exportSTL,
  scaledStats,
  intersectGeometry,
  DEFAULT_LIMITS,
  limitsWith,
} from "../../src/geometry.js";
import {
  modelMatrix,
  transform,
  inverse,
  multiply,
} from "../../src/math.js";
import { binary, cubePositions } from "./fixtures.js";
const almost = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
test("binary STL beginning with solid is detected by length", () => {
  const g = parseSTL(binary());
  assert.equal(g.triangles, 1);
  assert.equal(g.format, "stl-binary");
  assert.deepEqual(g.bounds, { min: [0, 0, 0], max: [1, 1, 0] });
  almost(g.area, 0.5);
});
test("ASCII exponent notation and binary represent identical vertices", () => {
  const text =
    "solid a\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1e0 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid a";
  assert.deepEqual(
    parseSTL(new TextEncoder().encode(text).buffer).positions,
    parseSTL(binary()).positions,
  );
});
test("invalid, incomplete, non-finite, empty and oversized STL is rejected", () => {
  for (const b of [
    new ArrayBuffer(0),
    binary().slice(0, 130),
    binary([NaN, 0, 0, 1, 0, 0, 0, 1, 0]),
    new TextEncoder().encode("solid a\nvertex 1 2 3\nendsolid").buffer,
  ])
    assert.throws(() => parseSTL(b));
  assert.throws(
    () =>
      parseSTL(binary(cubePositions()), {
        ...DEFAULT_LIMITS,
        max_triangles: 1,
      }),
    /limit/,
  );
});
test("VisCAM RGB is read and exported losslessly at 5-bit precision", () => {
  const g = parseSTL(
    binary(undefined, "test", 0x8000 | (31 << 10) | (16 << 5) | 8),
  );
  assert.deepEqual(
    [...g.colors.slice(0, 3)],
    [1, Math.fround(16 / 31), Math.fround(8 / 31)],
  );
  assert.deepEqual(parseSTL(exportSTL(g)).colors, g.colors);
});
test("Materialise object color and per-face reversed channel order", () => {
  const b = binary(undefined, "COLOR=", 0x8000),
    bytes = new Uint8Array(b);
  bytes.set([255, 128, 0, 255], 6);
  const g = parseSTL(b);
  assert.deepEqual([...g.colors.slice(0, 3)], [1, Math.fround(128 / 255), 0]);
  new DataView(b).setUint16(132, 31, true);
  assert.deepEqual([...parseSTL(b).colors.slice(0, 3)], [1, 0, 0]);
});
test("legacy colored STL header uses the archived channel convention", () =>
  assert.deepEqual(
    [
      ...parseSTL(
        binary(undefined, "Binary colored STL by viewstl.com", 31),
      ).colors.slice(0, 3),
    ],
    [1, 0, 0],
  ));
test("closed cube has exact dimensions, area and volume", () => {
  const g = finishGeometry(cubePositions());
  almost(g.area, 24);
  almost(g.volume, 8);
  assert.deepEqual(g.bounds, { min: [-1, -1, -1], max: [1, 1, 1] });
  const stats = scaledStats(g, [2, 3, 4]);
  almost(stats.area, 208);
  almost(stats.volume, 192);
});
test("STL export bakes scale and centering, preserves source", () => {
  const g = finishGeometry(cubePositions()),
    before = g.positions.slice(),
    out = parseSTL(exportSTL(g, [2, 3, 4], [1, 0, 0]));
  assert.deepEqual(out.bounds, { min: [-4, -3, -4], max: [0, 3, 4] });
  assert.deepEqual(g.positions, before);
});
test("derived feature edges omit coplanar diagonals; wire includes them", () => {
  const d = deriveGeometry(cubePositions(), {
    smooth: true,
    edges: true,
    wire: true,
  });
  assert.equal(d.edges.length, 12 * 6);
  assert.equal(d.wire.length, 18 * 6);
  assert.equal(d.smoothNormals.length, 108);
  assert.ok([...d.smoothNormals].every(Number.isFinite));
});
test("picking uses bounds, returns exact ray distance and misses", () => {
  const g = finishGeometry(cubePositions());
  almost(intersectGeometry(g, [0, 0, 5], [0, 0, -1]), 4);
  assert.equal(intersectGeometry(g, [5, 5, 5], [0, 0, -1]), Infinity);
});
test("model/inverse matrices preserve world distance under nonuniform scale", () => {
  const m = {
    x: 2,
    y: 3,
    z: 4,
    rotationx: 0.2,
    rotationy: 0.4,
    rotationz: 0.7,
    scaleVector: [2, 3, 4],
    center: [0.5, 0.5, 0.5],
  };
  const matrix = modelMatrix(m),
    inv = inverse(matrix),
    p = [6, 7, 8],
    round = transform(inv, transform(matrix, p));
  round.forEach((v, i) => almost(v, p[i]));
  const product = multiply(inv, matrix);
  product.forEach((v, i) => almost(v, i % 5 === 0 ? 1 : 0));
});
test("OBJ negative indices and polygon triangulation", () => {
  const obj = "v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf -4 -3 -2 -1";
  const g = parseOBJ(new TextEncoder().encode(obj).buffer);
  assert.equal(g.triangles, 2);
  almost(g.area, 1);
  assert.throws(
    () => parseOBJ(new TextEncoder().encode("v 0 0 0\nf 0 1 2").buffer),
    /index/,
  );
});
test("degenerate triangles produce finite normals and stats", () => {
  const g = parseSTL(binary(Array(9).fill(0)));
  assert.equal(g.degenerateTriangles, 1);
  assert.equal(g.area, 0);
  assert.ok([...g.normals].every(Number.isFinite));
});
test("transferring geometry detaches sender buffers", () => {
  const g = parseSTL(binary());
  const copy = structuredClone(g, {
    transfer: [g.positions.buffer, g.normals.buffer, g.blocks.buffer],
  });
  assert.equal(g.positions.byteLength, 0);
  assert.equal(copy.triangles, 1);
  assert.equal(copy.positions[3], 1);
});
test("limits reject invalid values rather than disabling protections", () => {
  assert.throws(() => limitsWith({ max_triangles: NaN }));
  assert.throws(() => limitsWith({ max_file_bytes: -1 }));
});
test("new parser matches archived legacy triangle coordinates", async () => {
  const context = { TextDecoder, DataView, Uint8Array, ArrayBuffer, console };
  vm.createContext(context);
  vm.runInContext(await readFile("legacy/v1/src/parser.js", "utf8"), context);
  for (const data of [binary(), binary(cubePositions())]) {
    let old;
    context.parse_3d_file("a.stl", data, (g) => (old = g));
    const flat = old.faces.flatMap((f) =>
      [f[0], f[1], f[2]].flatMap((i) => Array.from(old.vertices[i])),
    );
    assert.deepEqual([...parseSTL(data).positions], Array.from(flat));
  }
});
