import { test } from "node:test";
import assert from "node:assert/strict";
import { zipSync } from "fflate";
import { readFile } from "node:fs/promises";
import { unzipChecked, zipScene, parse3MF } from "../../src/archive.js";
import { DEFAULT_LIMITS } from "../../src/geometry.js";
import { binary, modelXML } from "./fixtures.js";
const encode = (s) => new TextEncoder().encode(s);
test("stored and deflated archives decode, with nested safe paths", () => {
  for (const level of [0, 6]) {
    const zip = zipSync(
      { "a.txt": encode("hello".repeat(1000)), "dir/b.txt": encode("two") },
      { level },
    );
    const files = unzipChecked(zip.buffer);
    assert.equal(
      new TextDecoder().decode(files.get("a.txt")),
      "hello".repeat(1000),
    );
    assert.equal(files.size, 2);
  }
});
test("corrupt, truncated and oversized expansion archives fail", () => {
  const bytes = zipSync({ "a.txt": encode("hello") }, { level: 0 });
  const bad = bytes.slice();
  bad[35] ^= 1;
  assert.throws(() => unzipChecked(bad.buffer));
  assert.throws(() => unzipChecked(bytes.slice(0, -5).buffer));
  assert.throws(
    () =>
      unzipChecked(bytes.buffer, {
        ...DEFAULT_LIMITS,
        max_uncompressed_bytes: 1,
      }),
    /expansion/,
  );
});
test("path traversal and entry count limits are enforced", () => {
  assert.throws(
    () => unzipChecked(zipSync({ "../evil": encode("x") }).buffer),
    /path/,
  );
  assert.throws(() =>
    unzipChecked(zipSync({ a: encode("x"), b: encode("y") }).buffer, {
      ...DEFAULT_LIMITS,
      max_archive_entries: 1,
    }),
  );
});
test("VSB packaging preserves manifest and binary bytes", () => {
  const scene = {
      vsj: { models: [{ id: -1, filename: "0.stl" }] },
      files: [{ id: 0, bin: binary() }],
    },
    files = unzipChecked(zipScene(scene));
  assert.deepEqual(
    JSON.parse(new TextDecoder().decode(files.get("json_data.vsj"))),
    scene.vsj,
  );
  assert.deepEqual(files.get("0.stl"), new Uint8Array(scene.files[0].bin));
});
test("3MF follows root relationships, nested component transforms and colors", () => {
  const rel =
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="a" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" Target="/Models/main.model"/></Relationships>';
  const zip = zipSync({
      "_rels/.rels": encode(rel),
      "Models/main.model": encode(modelXML),
    }),
    g = parse3MF(zip.buffer);
  assert.equal(g.triangles, 1);
  assert.deepEqual(g.bounds, { min: [2, 3, 0], max: [3, 4, 0] });
  assert.deepEqual([...g.colors.slice(0, 3)], [1, 0, 0]);
});
test("3MF cycles, invalid indices, unknown units and DTDs fail", () => {
  for (const xml of [
    modelXML.replace('objectid="1"', 'objectid="2"'),
    modelXML.replace('v1="0"', 'v1="9"'),
    modelXML.replace('unit="millimeter"', 'unit="bad"'),
    modelXML.replace(
      '<?xml version="1.0"?>',
      '<?xml version="1.0"?><!DOCTYPE model>',
    ),
  ])
    assert.throws(() =>
      parse3MF(zipSync({ "3D/3dmodel.model": encode(xml) }).buffer),
    );
});
test("archived real VSB files remain readable", async () => {
  for (const filename of [
    "tests/v2/data/legacy-scene.vsb",
    "tests/v2/data/legacy-multi.vsb",
  ]) {
    const data = await readFile(filename);
    const files = unzipChecked(
      data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    );
    assert.ok(files.has("json_data.vsj"));
  }
});
