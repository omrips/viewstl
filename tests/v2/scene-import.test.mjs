import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateScene,
  localSceneFile,
  sceneURL,
} from "../../src/scene-import.js";
import { readSceneDocument } from "../../src/scene-reader.js";
import { DEFAULT_LIMITS } from "../../src/geometry.js";
import { zipSync } from "fflate";
const source = {
  models: [
    {
      id: 0,
      filename: "part.stl",
      x: 4,
      rotationz: 1,
      color: "#abcdef",
      section: { axis: "z", position: 0.5 },
    },
  ],
};
const encode = (x) => new TextEncoder().encode(JSON.stringify(x));
test("scene manifest selects safe fields and validates transforms, settings and camera", () => {
  const s = validateScene(
    {
      ...source,
      canvas_height: "999999px",
      models: [
        {
          ...source.models[0],
          remote_url: "http://private/",
          local_file: {},
          data: {},
        },
      ],
    },
    DEFAULT_LIMITS,
  );
  assert.equal(s.canvas_height, undefined);
  assert.equal(s.models[0].remote_url, undefined);
  assert.equal(s.models[0].data, undefined);
  assert.equal(s.models[0].x, 4);
  for (const bad of [
    { models: [] },
    { models: [{ filename: "nested.vsb" }] },
    { ...source, infinite_grid: { spacing: 0, height: 0 } },
    { models: [{ filename: "part.stl", scalex: 0 }] },
    { models: [{ filename: "part.stl", opacity: 2 }] },
    {
      models: [{ filename: "part.stl", section: { axis: "q", position: 0.5 } }],
    },
    {
      ...source,
      camera_state: {
        position: { x: 0, y: 0, z: 1 },
        target: { x: 0, y: 0, z: 0 },
        up: { x: 0, y: 0, z: 1 },
      },
    },
  ])
    assert.throws(() => validateScene(bad, DEFAULT_LIMITS));
});
test("local VSJ filenames resolve exact paths and reject ambiguous basenames", () => {
  const a = new File(["a"], "part.stl"),
    b = new File(["b"], "part.stl");
  assert.equal(localSceneFile("folder/part.stl", [a]), a);
  assert.equal(localSceneFile("part.stl", [a, a]), a);
  assert.throws(() => localSceneFile("part.stl", [a, b]), /More than one/);
  assert.equal(localSceneFile("missing.stl", [a]), null);
});
test("scene URLs accept public protocols only and resolve relative paths explicitly", () => {
  assert.equal(sceneURL("part.stl"), null);
  assert.equal(
    sceneURL("../part.stl?token=a#fragment", "https://files.example/dir/"),
    "https://files.example/part.stl?token=a",
  );
  for (const bad of [
    "file:///c:/private.stl",
    "data:text/plain,hi",
    "javascript:alert(1)",
    "https://user:pass@files.example/part.stl",
  ])
    assert.throws(() => sceneURL(bad));
});
test("scene reader rejects invalid JSON, missing VSB files and oversized manifests", () => {
  assert.throws(() =>
    readSceneDocument(encode({ models: [] }).buffer, "vsj", DEFAULT_LIMITS),
  );
  assert.throws(() =>
    readSceneDocument(new Uint8Array([255]).buffer, "vsj", DEFAULT_LIMITS),
  );
  assert.throws(
    () =>
      readSceneDocument(
        zipSync({ "json_data.vsj": encode(source) }).buffer,
        "vsb",
        DEFAULT_LIMITS,
      ),
    /missing/,
  );
  const zip = zipSync({
    "json_data.vsj": encode(source),
    "part.stl": new Uint8Array([1, 2, 3]),
  });
  const data = readSceneDocument(zip.buffer, "vsb", DEFAULT_LIMITS);
  assert.deepEqual([...new Uint8Array(data.files["part.stl"])], [1, 2, 3]);
  assert.throws(
    () =>
      readSceneDocument(zip.buffer, "vsb", {
        ...DEFAULT_LIMITS,
        max_archive_entries: 1,
      }),
    /oversized/,
  );
});
