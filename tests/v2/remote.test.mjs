import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { decodeRemoteStream } from "../../src/remote.js";
import { parseSTL } from "../../src/parser.js";
import { DEFAULT_LIMITS } from "../../src/geometry.js";
const bytes = new Uint8Array(await readFile(new URL("./data/cube.stl", import.meta.url)));
function stream(data, step = 31, onCancel = () => {}) {
  let offset = 0;
  return new ReadableStream({ pull(c) { if (offset === data.length) return c.close(); const end = Math.min(data.length, offset + step); c.enqueue(data.slice(offset, end)); offset = end; }, cancel: onCancel });
}
test("remote binary STL decodes across headers and triangle boundaries without an input buffer", async () => {
  const expected = parseSTL(bytes.buffer, DEFAULT_LIMITS);
  for (const size of [1, 31, 50, 83, 84, 511, 65536]) {
    for (const total of [0, bytes.length]) {
      const result = await decodeRemoteStream(stream(bytes, size), DEFAULT_LIMITS, "stl", total);
      assert.deepEqual(result.geometry.positions, expected.positions);
      assert.equal(result.buffer, undefined);
      assert.equal(result.size, bytes.length);
    }
  }
});
test("remote streams reject truncation, appended data and limits", async () => {
  await assert.rejects(decodeRemoteStream(stream(bytes.subarray(0, bytes.length - 1)), DEFAULT_LIMITS, "stl", bytes.length), /incomplete/);
  const extra = new Uint8Array(bytes.length + 50); extra.set(bytes);
  await assert.rejects(decodeRemoteStream(stream(extra), DEFAULT_LIMITS, "stl", 0), /extra data/);
  let cancelled = false;
  await assert.rejects(decodeRemoteStream(stream(bytes, 84, () => { cancelled = true; }), { ...DEFAULT_LIMITS, max_triangles: 1 }, "stl", bytes.length), /Triangle limit/);
  assert.equal(cancelled, true);
});
test("remote ASCII STL and other formats retain exact bytes with and without lengths", async () => {
  const text = new TextEncoder().encode("solid a\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid a\n");
  for (const format of ["stl", "obj", "3mf", "step"]) for (const total of [0, text.length]) {
    const result = await decodeRemoteStream(stream(text), DEFAULT_LIMITS, format, total);
    assert.deepEqual(new Uint8Array(result.buffer), text);
  }
});
