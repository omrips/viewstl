import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import factory from "../../build/cad/occt-import-js.js";
import { parseCAD, cadGeometry, cadMemory } from "../../src/cad.js";
import { DEFAULT_LIMITS } from "../../src/geometry.js";

const limits = { ...DEFAULT_LIMITS, max_memory_bytes: 1024 ** 3 };
const wasmBinary = await readFile(
  new URL("../../build/cad/occt-import-js.wasm", import.meta.url),
);
const fixtureRoot = new URL(
  "../../node_modules/occt-import-js/test/testfiles/",
  import.meta.url,
);
const initialize = (options) => factory({ ...options, wasmBinary });
async function input(path) {
  const bytes = await readFile(new URL(path, fixtureRoot));
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
}
const load = async (path, name = path, customLimits = limits) =>
  parseCAD(await input(path), name, customLimits, () => {}, initialize);

test("STEP/STP and IGES/IGS parse through the CSP-compatible WASM reader", async () => {
  for (const extension of ["step", "STP"]) {
    const result = await load(
      "cube-10x10mm/Cube 10x10.stp",
      `cube.${extension}`,
    );
    assert.equal(result.triangles, 12);
    assert.equal(result.units, "mm");
    assert.equal(result.format, "step");
    assert.deepEqual(
      result.bounds.max.map((v, i) => v - result.bounds.min[i]),
      [10, 10, 10],
    );
  }
  for (const extension of ["iges", "IGS"]) {
    const result = await load(
      "cube-10x10mm/Cube 10x10.igs",
      `cube.${extension}?v=1`,
    );
    assert.equal(result.triangles, 12);
    assert.equal(result.format, "iges");
    assert.equal(result.units, "mm");
    assert.deepEqual(
      result.bounds.max.map((v, i) => v - result.bounds.min[i]),
      [10, 10, 10],
    );
  }
});

test("STEP unit conversion and assembly coordinates/colors survive mesh adaptation", async () => {
  const inches = await load("cube-units/cube-in.step");
  const mm = await load("cube-units/cube-mm.step");
  assert.deepEqual(inches.bounds, mm.bounds);
  const assembly = await load("cax-if/as1-oc-214.stp");
  assert.ok(assembly.triangles > 1000);
  assert.ok(assembly.colors?.length === assembly.positions.length);
  assert.ok(assembly.bounds.max[0] - assembly.bounds.min[0] > 100);
});

test("malformed CAD fails and a subsequent valid model still loads", async () => {
  for (const extension of ["step", "iges"])
    await assert.rejects(
      parseCAD(
        new TextEncoder().encode("not a CAD file").buffer,
        `bad.${extension}`,
        limits,
        () => {},
        initialize,
      ),
      /No supported surfaces|could not be processed/,
    );
  assert.equal((await load("simple-basic-cube/cube.stp")).triangles, 12);
});

test("CAD input budget rejects before engine initialization; output triangle budget is enforced", async () => {
  let started = false;
  await assert.rejects(
    parseCAD(
      new ArrayBuffer(100),
      "large.step",
      { ...limits, max_memory_bytes: 64 * 1024 ** 2 },
      () => {},
      () => {
        started = true;
      },
    ),
    /safety budget/,
  );
  assert.equal(started, false);
  assert.equal(cadMemory(100), 128 * 1024 ** 2 + 4000);
  await assert.rejects(
    load("simple-basic-cube/cube.stp", "cube.step", {
      ...limits,
      max_triangles: 11,
    }),
    /Triangle limit/,
  );
});

function mesh() {
  return {
    attributes: { position: { array: [10, 0, 0, 11, 0, 0, 10, 1, 0] } },
    index: { array: [0, 1, 2] },
    color: [1, 0, 0],
    brep_faces: [{ first: 0, last: 0, color: [0, 1, 0] }],
  };
}
test("CAD adapter validates indices/coordinates and preserves per-face colors and placement", () => {
  const source = mesh();
  const geometry = cadGeometry({ success: true, meshes: [source] }, limits);
  assert.deepEqual([...geometry.colors], [0, 1, 0, 0, 1, 0, 0, 1, 0]);
  assert.deepEqual(geometry.bounds.min, [10, 0, 0]);
  source.index.array[2] = 99;
  assert.throws(
    () => cadGeometry({ success: true, meshes: [source] }, limits),
    /index/,
  );
  const bad = mesh();
  bad.attributes.position.array[0] = NaN;
  assert.throws(
    () => cadGeometry({ success: true, meshes: [bad] }, limits),
    /Non-finite/,
  );
  const badFace = mesh();
  badFace.brep_faces[0].last = 3;
  assert.throws(
    () => cadGeometry({ success: true, meshes: [badFace] }, limits),
    /face range/,
  );
  assert.throws(
    () => cadGeometry({ success: true, meshes: [] }, limits),
    /No supported surfaces/,
  );
});

test("CAD engine obeys the configured heap ceiling and reports its phases", async () => {
  let engine;
  const phases = [];
  await parseCAD(
    await input("simple-basic-cube/cube.stp"),
    "cube.stp",
    limits,
    (p) => phases.push(p),
    async (options) => {
      assert.ok(options.viewstlMaxHeapBytes <= 512 * 1024 ** 2);
      engine = await initialize(options);
      return engine;
    },
  );
  assert.deepEqual(phases, ["loading-cad", "parsing-cad"]);
  assert.ok(engine.HEAPU8.byteLength < 512 * 1024 ** 2);
  const bounded = await initialize({
    viewstlMaxHeapBytes: 32 * 1024 ** 2,
    print() {},
    printErr() {},
  });
  assert.throws(() =>
    bounded.ReadStepFile(new Uint8Array(40 * 1024 ** 2), null),
  );
  assert.ok(bounded.HEAPU8.byteLength <= 32 * 1024 ** 2);
});
