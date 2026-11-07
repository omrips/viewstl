import { test } from "node:test";
import assert from "node:assert/strict";
import { exportSceneArchive } from "../../src/scene-export.js";
import { exportFilename } from "../../src/export-options.js";
import { DEFAULT_LIMITS } from "../../src/geometry.js";
import { unzipChecked } from "../../src/archive.js";
import { parseGeometry } from "../../src/parser.js";

const model = () => ({
  id: 7,
  triangles: 1,
  positions: new Float32Array([1, 0, 0, 2, 0, 0, 1, 1, 0]),
  colors: new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0]),
  scale: [2, 3, 4],
  center: [1, 0, 0],
});
const scene = {
  models: [
    {
      id: -1,
      filename: "7.stl",
      x: 20,
      rotationz: 1,
      section: { axis: "z", position: 0.5 },
    },
  ],
  bg_color: "#202d35",
};
test("scene worker uses legacy VSB entries, transforms and colored STL", async () => {
  const input = model(),
    before = input.positions.slice(),
    progress = [];
  const blob = exportSceneArchive(scene, [input], DEFAULT_LIMITS, (p) =>
    progress.push(p),
  );
  const files = unzipChecked(await blob.arrayBuffer());
  assert.deepEqual(
    JSON.parse(new TextDecoder().decode(files.get("json_data.vsj"))),
    scene,
  );
  const geometry = await parseGeometry(files.get("7.stl").buffer, "7.stl");
  assert.deepEqual(geometry.bounds, { min: [0, 0, 0], max: [2, 3, 0] });
  assert.deepEqual([...geometry.colors.slice(0, 3)], [1, 0, 0]);
  assert.deepEqual(input.positions, before);
  assert.deepEqual(
    progress.map((p) => p.phase),
    ["exporting", "packaging", "complete"],
  );
});
test("scene worker enforces archive and compressed output limits", () => {
  for (const limits of [
    { max_archive_entries: 1 },
    { max_uncompressed_bytes: 1 },
    { max_file_bytes: 1 },
  ])
    assert.throws(
      () =>
        exportSceneArchive(
          scene,
          [model()],
          { ...DEFAULT_LIMITS, ...limits },
          () => {},
        ),
      /limit/i,
    );
});
test("scene filenames strip paths and replace mesh or scene extensions", () => {
  assert.equal(exportFilename("../../model.step", "vsb"), "model.vsb");
  assert.equal(exportFilename("scene.vsb", "vsj"), "scene.vsj");
  assert.equal(exportFilename("scene.vsj", "stl"), "scene.stl");
  assert.equal(
    exportFilename("bad:name.stl?token=secret", "vsb"),
    "bad_name.vsb",
  );
});
