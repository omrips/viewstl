import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { exportGeometry } from "../../src/export.js";
import { exportOptions } from "../../src/export-options.js";
import { DEFAULT_LIMITS, finishGeometry } from "../../src/geometry.js";
import { identity, modelMatrix, transform } from "../../src/math.js";
import { parseGeometry } from "../../src/parser.js";
import { parse3MF, unzipChecked } from "../../src/archive.js";
import { cadGeometry } from "../../src/cad.js";
import { StlViewer } from "../../src/viewer.js";
import { cubePositions } from "./fixtures.js";
import factory from "../../build/cad/occt-import-js.js";

const limits = { ...DEFAULT_LIMITS, max_memory_bytes: 1024 ** 3 };
const cube = (id = 0) => ({
  id,
  name: "cube",
  positions: cubePositions(),
  matrix: identity(),
  opacity: 1,
});
const close = (a, b, tolerance = 1e-5) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const boundsClose = (a, b) => {
  for (const k of ["min", "max"]) a[k].forEach((v, i) => close(v, b[k][i]));
};

test("export formats, aliases, filename sanitation and option errors", async () => {
  assert.deepEqual(
    exportOptions({ format: "STP", filename: "../../part.stl" }),
    {
      format: "step",
      filename: "part.step",
      units: "mm",
      colors: false,
      apply_transforms: true,
    },
  );
  assert.equal(
    exportOptions({ format: "obj", filename: "part.obj" }).filename,
    "part.zip",
  );
  assert.equal(
    exportOptions({ format: "obj", colors: false }).filename,
    "scene.obj",
  );
  assert.equal(exportOptions({ format: "igs" }).format, "iges");
  for (const options of [
    { format: "f3d" },
    { format: "stl", units: "cm" },
    { format: "obj", colors: 1 },
  ])
    assert.throws(() => exportOptions(options));
  await assert.rejects(exportGeometry([], { format: "stl" }), /No models/);
});

test("binary STL encodes all transforms, recomputes normals and leaves input intact", async () => {
  const m = cube(),
    before = m.positions.slice();
  m.matrix = modelMatrix({
    rotationx: 0.37,
    rotationy: -0.28,
    rotationz: 1.1,
    scaleVector: [2, 3, 4],
    center: [0.5, 0, -1],
    x: 15,
    y: -8,
    z: 30,
  });
  const events = [],
    result = await exportGeometry([m], { format: "stl" }, limits, (p) =>
      events.push(p),
    );
  assert.equal(result.blob.size, 84 + 12 * 50);
  const data = await result.blob.arrayBuffer(),
    parsed = parseGeometry(data, "out.stl", limits);
  const expected = [];
  for (let i = 0; i < m.positions.length; i += 3)
    expected.push(...transform(m.matrix, [...m.positions.subarray(i, i + 3)]));
  parsed.positions.forEach((v, i) => close(v, expected[i]));
  assert.deepEqual(m.positions, before);
  assert.equal(new DataView(data).getUint16(132, true), 0);
  assert.deepEqual(events.at(-1), { loaded: 12, total: 12, phase: "complete" });
});

test("STL reflects winding and keeps outward normals", async () => {
  const m = cube();
  m.matrix[0] = -2;
  const parsed = parseGeometry(
    await (await exportGeometry([m], { format: "stl" })).blob.arrayBuffer(),
    "m.stl",
  );
  close(parsed.volume, 16);
  close(parsed.normals[2], -1);
  assert.deepEqual(parsed.bounds, { min: [-2, -1, -1], max: [2, 1, 1] });
});

test("OBJ supports object groups, one normal per face, safe names and color/opacity MTL", async () => {
  const a = cube(),
    b = cube(1);
  a.name = "bad\nmtllib evil.mtl";
  a.color = [1, 0, 0];
  a.opacity = 0.5;
  b.matrix[12] = 5;
  b.color = [0, 1, 0];
  const result = await exportGeometry([a, b], { format: "obj" });
  const files = unzipChecked(await result.blob.arrayBuffer()),
    decoder = new TextDecoder();
  assert.deepEqual([...files.keys()], ["model.obj", "materials.mtl"]);
  const obj = decoder.decode(files.get("model.obj")),
    mtl = decoder.decode(files.get("materials.mtl"));
  assert.equal((obj.match(/^o /gm) || []).length, 2);
  assert.equal((obj.match(/^mtllib /gm) || []).length, 1);
  assert.match(mtl, /Kd 1 0 0/);
  assert.match(mtl, /Kd 0 1 0/);
  assert.match(mtl, /d 0\.501960/);
  const mesh = parseGeometry(files.get("model.obj").buffer, "model.obj");
  assert.equal(mesh.triangles, 24);
  assert.deepEqual(mesh.bounds, { min: [-1, -1, -1], max: [6, 1, 1] });
  const plain = await exportGeometry([a], { format: "obj", colors: false });
  assert.equal(plain.filename, "scene.obj");
  assert.doesNotMatch(await plain.blob.text(), /^(mtllib|usemtl) /m);
});

test("3MF preserves separate objects, indexed vertices, units, color gradients and XML names", async () => {
  const a = cube(),
    b = cube(1);
  a.name = 'A<&"';
  a.colors = new Float32Array(a.positions.length);
  for (let i = 0; i < a.colors.length; i += 9)
    a.colors.set([1, 0, 0, 0, 1, 0, 0, 0, 1], i);
  b.matrix[12] = 5;
  b.color = [0.2, 0.4, 0.6];
  const result = await exportGeometry([a, b], { format: "3mf" });
  const bytes = await result.blob.arrayBuffer(),
    files = unzipChecked(bytes);
  await mkdir("test-results/exports", { recursive: true });
  await writeFile(
    "test-results/exports/colored-scene.3mf",
    new Uint8Array(bytes),
  );
  const xml = new TextDecoder().decode(files.get("3D/3dmodel.model"));
  assert.equal((xml.match(/<object /g) || []).length, 2);
  assert.equal((xml.match(/<vertex /g) || []).length, 16);
  assert.match(xml, /A&lt;&amp;&quot;/);
  const parsed = parse3MF(bytes);
  assert.equal(parsed.triangles, 24);
  assert.deepEqual(parsed.bounds, { min: [-1, -1, -1], max: [6, 1, 1] });
  assert.deepEqual(
    [...parsed.colors.subarray(0, 9)],
    [1, 0, 0, 0, 1, 0, 0, 0, 1],
  );
  const inches = cube();
  for (const k of [0, 5, 10]) inches.matrix[k] = 1 / 25.4;
  const converted = parse3MF(
    await (
      await exportGeometry([inches], {
        format: "3mf",
        units: "inch",
        colors: false,
      })
    ).blob.arrayBuffer(),
  );
  boundsClose(converted.bounds, { min: [-1, -1, -1], max: [1, 1, 1] });
});

test("3MF rejects open/nonmanifold meshes without producing invalid printable solids", async () => {
  const open = cube();
  open.positions = open.positions.slice(0, 9);
  await assert.rejects(
    exportGeometry([open], { format: "3mf" }),
    /closed meshes/,
  );
  const duplicate = cube();
  duplicate.positions = new Float32Array([
    ...duplicate.positions,
    ...duplicate.positions,
  ]);
  await assert.rejects(
    exportGeometry([duplicate], { format: "3mf" }),
    /closed meshes/,
  );
  const reversed = cube();
  for (let i = 0; i < reversed.positions.length; i += 9)
    for (let k = 0; k < 3; k++)
      [reversed.positions[i + 3 + k], reversed.positions[i + 6 + k]] = [
        reversed.positions[i + 6 + k],
        reversed.positions[i + 3 + k],
      ];
  await assert.rejects(
    exportGeometry([reversed], { format: "3mf" }),
    /positive mesh volume/,
  );
});

let engine;
async function cadRead(blob, format) {
  engine ??= await factory({
    wasmBinary: await readFile("build/cad/occt-import-js.wasm"),
    print() {},
    printErr() {},
  });
  const method = format === "step" ? "ReadStepFile" : "ReadIgesFile";
  const result = engine[method](new Uint8Array(await blob.arrayBuffer()), {
    linearUnit: "millimeter",
  });
  assert.equal(result.success, true);
  return cadGeometry(result, limits);
}

for (const format of ["step", "iges"]) {
  test(`${format} is read by Open CASCADE with transformed faces, multiple models and correct inch units`, async () => {
    const a = cube(),
      b = cube(1);
    a.name = "O'Brien \\ part שלום";
    a.matrix = modelMatrix({
      rotationx: 0.43,
      rotationy: 0.2,
      rotationz: 0.7,
      scaleVector: [2, 3, 4],
      center: [0.2, 0, 0.1],
      x: 15,
      y: -4,
      z: 30,
    });
    b.matrix[12] = -10;
    for (const units of ["mm", "inch"]) {
      const models = [a, b].map((m) => ({ ...m, matrix: m.matrix.slice() }));
      if (units === "inch")
        for (const m of models)
          for (let c = 0; c < 4; c++)
            for (let r = 0; r < 3; r++) m.matrix[c * 4 + r] /= 25.4;
      const result = await exportGeometry(models, { format, units });
      const parsed = await cadRead(result.blob, format);
      assert.equal(parsed.triangles, 24);
      const stl = parseGeometry(
        await (
          await exportGeometry([a, b], { format: "stl" })
        ).blob.arrayBuffer(),
        "expected.stl",
      );
      boundsClose(parsed.bounds, stl.bounds);
      close(parsed.area, stl.area, 1e-3);
      await mkdir("test-results/exports", { recursive: true });
      await writeFile(
        `test-results/exports/assembly-${units}.${format}`,
        new Uint8Array(await result.blob.arrayBuffer()),
      );
      if (format === "iges") {
        const lines = (await result.blob.text()).trimEnd().split("\n");
        for (const line of lines) assert.equal(line.length, 80);
        assert.equal(lines.at(-1)[72], "T");
      }
    }
  });
  test(`${format} supports open triangle surfaces and rejects degenerates`, async () => {
    const a = cube();
    a.positions = a.positions.slice(0, 9);
    const parsed = await cadRead(
      (await exportGeometry([a], { format })).blob,
      format,
    );
    assert.equal(parsed.triangles, 1);
    close(parsed.area, 2);
    a.positions.fill(0);
    await assert.rejects(exportGeometry([a], { format }), /non-degenerate/);
  });
}

test("export size, memory, triangle and ZIP limits reject and subsequent export recovers", async () => {
  for (const format of ["stl", "obj", "3mf", "step", "iges"])
    await assert.rejects(
      exportGeometry(
        [cube()],
        { format },
        { ...limits, max_file_bytes: 100, max_uncompressed_bytes: 100 },
      ),
      /size limit/,
    );
  await assert.rejects(
    exportGeometry(
      [cube()],
      { format: "stl" },
      { ...limits, max_memory_bytes: 1000 },
    ),
    /safety budget/,
  );
  await assert.rejects(
    exportGeometry(
      [cube()],
      { format: "stl" },
      { ...limits, max_triangles: 1 },
    ),
    /triangle limit/,
  );
  await assert.rejects(
    exportGeometry(
      [cube()],
      { format: "3mf" },
      { ...limits, max_archive_entries: 2 },
    ),
    /entry limit/,
  );
  assert.equal(
    (await exportGeometry([cube()], { format: "stl" })).triangles,
    12,
  );
});

function viewer() {
  const v = Object.create(StlViewer.prototype),
    geometry = finishGeometry(cubePositions());
  const model = {
    id: 0,
    filename: "cube.step",
    geometry,
    x: 10,
    y: 0,
    z: 0,
    rotationx: 0,
    rotationy: 0,
    rotationz: 0,
    scaleVector: [2, 2, 2],
    unitScale: 1,
    center: [0, 0, 0],
    opacity: 1,
  };
  Object.assign(v, {
    when_ready: Promise.resolve(),
    _models: new Map([[0, model]]),
    _memoryReservations: new Map(),
    _exportBytes: 0,
    limits,
    renderer: { selection: model },
  });
  v._pool = {
    run(task, progress, transfer) {
      const copy = structuredClone(task, { transfer });
      const promise = exportGeometry(
        copy.models,
        copy.options,
        copy.limits,
        progress,
      );
      promise.cancel = () => {};
      return promise;
    },
  };
  return v;
}

test("public API snapshots selected geometry without detaching live arrays, and supports source coordinates", async () => {
  const v = viewer(),
    source = v._models.get(0).geometry.positions;
  const result = await v.export_models({
    format: "stl",
    model_ids: "selected",
    filename: "changed.obj",
  });
  assert.equal(result.filename, "changed.stl");
  assert.equal(source.length, 108);
  assert.equal(v._exportBytes, 0);
  assert.deepEqual(
    parseGeometry(await result.blob.arrayBuffer(), "x.stl").bounds,
    { min: [8, -2, -2], max: [12, 2, 2] },
  );
  const raw = await v.export_models({
    format: "stl",
    model_ids: [0],
    apply_transforms: false,
  });
  assert.deepEqual(
    parseGeometry(await raw.blob.arrayBuffer(), "x.stl").bounds,
    { min: [-1, -1, -1], max: [1, 1, 1] },
  );
  const inches = await v.export_models({ format: "stl", units: "inch" });
  close(
    parseGeometry(await inches.blob.arrayBuffer(), "x.stl").bounds.max[0],
    12 / 25.4,
  );
});

test("public API rejects missing/duplicate/unloaded selection, abort and budget exhaustion before copying", async () => {
  const v = viewer();
  await assert.rejects(
    v.export_models({ format: "stl", model_ids: [] }),
    /No models/,
  );
  await assert.rejects(
    v.export_models({ format: "stl", model_ids: [0, 0] }),
    /unique/,
  );
  await assert.rejects(v.export_models({ format: "stl", model_ids: [123] }));
  v.renderer.selection = null;
  await assert.rejects(
    v.export_models({ format: "stl", model_ids: "selected" }),
    /No models/,
  );
  const c = new AbortController();
  c.abort();
  await assert.rejects(v.export_models({ format: "stl", signal: c.signal }), {
    name: "AbortError",
  });
  v.limits = { ...limits, max_memory_bytes: 1 };
  await assert.rejects(v.export_models({ format: "stl" }), /safety budget/);
  assert.equal(v._exportBytes, 0);
  v.limits = limits;
  v._models.get(0).geometry = null;
  await assert.rejects(v.export_models({ format: "stl" }), /finished loading/);
});

test("public API releases memory reservations on allocation or dispatch failure", async () => {
  const v = viewer();
  v._pool.run = () => {
    throw new Error("dispatch failed");
  };
  await assert.rejects(v.export_models({ format: "obj" }), /dispatch failed/);
  assert.equal(v._exportBytes, 0);
  v._models.get(0).geometry.positions = {
    slice() {
      throw new Error("allocation failed");
    },
  };
  await assert.rejects(v.export_models({ format: "stl" }), /allocation failed/);
  assert.equal(v._exportBytes, 0);
});
