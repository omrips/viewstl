import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBinarySTLBlob, parseSTL, parseOBJ } from "../../src/parser.js";
import { readSource } from "../../src/io.js";
import { DEFAULT_LIMITS, limitsWith } from "../../src/geometry.js";
import {
  MEMORY_OVERHEAD,
  TRIANGLE_MEMORY,
  derivedMemory,
  assertMemory,
} from "../../src/memory.js";
import { binary, cubePositions, modelXML } from "./fixtures.js";
import { parse3MF } from "../../src/archive.js";
import { zipSync } from "fflate";
import {Renderer} from '../../src/renderer.js';
const generous = { ...DEFAULT_LIMITS, max_memory_bytes: 512 * 1024 ** 2 };
test('GPU allocation failure frees partial buffers and reports the error',()=>{
  const deleted=[],vao={},buffer={};
  const gl={NO_ERROR:0,OUT_OF_MEMORY:1285,ARRAY_BUFFER:1,STATIC_DRAW:2,
    createVertexArray:()=>vao,createBuffer:()=>buffer,bindVertexArray:()=>{},bindBuffer:()=>{},bufferData:()=>{},getError:()=>1285,
    deleteBuffer:b=>deleted.push(b),deleteVertexArray:v=>deleted.push(v)};
  assert.throws(()=>Renderer.prototype.upload.call({gl},new Float32Array(9)),/graphics memory/);
  assert.deepEqual(deleted,[buffer,vao]);
});
test("chunked binary STL matches buffer parser across boundaries and late colors", async () => {
  for (const header of [
    "solid binary header",
    "COLOR=",
    "Binary colored STL by viewstl.com",
  ]) {
    const bytes = binary(cubePositions(), header),
      d = new DataView(bytes);
    d.setUint16(84 + 7 * 50 + 48, 0x8000 | (31 << 10) | 8, true);
    const blob = new Blob([bytes]),
      progress = [],
      reads = [];
    const source = {
      size: blob.size,
      slice(a, b) {
        reads.push([a, b]);
        return blob.slice(a, b);
      },
    };
    const result = await parseBinarySTLBlob(
      source,
      generous,
      (a, b) => progress.push([a, b]),
      3,
    );
    assert.deepEqual(result, parseSTL(bytes, generous));
    assert.ok(reads.every(([a, b]) => b - a <= 150));
    assert.deepEqual(progress.at(-1), [bytes.byteLength, bytes.byteLength]);
  }
});
test("chunked STL checks budget and malformed metadata before reading triangle data", async () => {
  const bytes = binary(cubePositions()),
    blob = new Blob([bytes]);
  let reads = 0;
  const source = {
    size: blob.size,
    slice(a, b) {
      reads++;
      return blob.slice(a, b);
    },
  };
  await assert.rejects(
    parseBinarySTLBlob(source, {
      ...generous,
      max_memory_bytes: MEMORY_OVERHEAD + 12 * TRIANGLE_MEMORY - 1,
    }),
    /safety budget/,
  );
  assert.equal(reads, 1);
  await assert.rejects(
    parseBinarySTLBlob(blob, { ...generous, max_file_bytes: 1 }),
    /size limit/,
  );
  const malformed = bytes.slice(0, -1);
  assert.equal(await parseBinarySTLBlob(new Blob([malformed])), null);
  assert.equal(
    await parseBinarySTLBlob(new Blob(["solid a\nendsolid a"])),
    null,
  );
  await assert.rejects(
    parseBinarySTLBlob(blob, generous, () => {}, 0),
    /chunk size/,
  );
});
test("STL budgets account for whole input while streaming avoids that retained buffer", async () => {
  const b = binary(cubePositions()),
    limits = {
      ...generous,
      max_memory_bytes: MEMORY_OVERHEAD + 12 * TRIANGLE_MEMORY,
    };
  assert.equal((await parseBinarySTLBlob(new Blob([b]), limits)).triangles, 12);
  assert.throws(() => parseSTL(b, limits), /safety budget/);
  const invalid = binary([NaN, 0, 0, 1, 0, 0, 0, 1, 0]);
  await assert.rejects(parseBinarySTLBlob(new Blob([invalid])), /Non-finite/);
});
test("text and archive parser memory guards remain active for raised byte limits", () => {
  const limits = {
    ...generous,
    max_file_bytes: Number.MAX_SAFE_INTEGER,
    max_triangles: Number.MAX_SAFE_INTEGER,
    max_memory_bytes: MEMORY_OVERHEAD,
  };
  assert.throws(
    () =>
      parseOBJ(
        new TextEncoder().encode("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3").buffer,
        limits,
      ),
    /safety budget/,
  );
  assert.throws(
    () =>
      parseSTL(new TextEncoder().encode("solid a\nendsolid a").buffer, limits),
    /safety budget/,
  );
  const z = zipSync({ "3D/3dmodel.model": new TextEncoder().encode(modelXML) });
  assert.throws(() => parse3MF(z.buffer, limits), /safety budget/);
});
test("smooth and wire estimates are bounded before allocating their maps", () => {
  assert.equal(limitsWith({ max_memory_bytes: 1024 }).max_memory_bytes, 1024);
  assert.throws(() => limitsWith({ max_memory_bytes: Infinity }), /Invalid/);
  assert.throws(
    () =>
      assertMemory(
        { max_memory_bytes: 128 * 1024 ** 2 },
        derivedMemory(100000, { smooth: true }),
        "view mode",
      ),
    /view mode/,
  );
  assert.ok(derivedMemory(10, { wire: true }) > derivedMemory(10, {}));
});
test("Blob reads avoid the retained chunk array and honor cancellation", async () => {
  const blob = new Blob(["abc"]);
  blob.stream = () => {
    throw new Error("stream should not be called");
  };
  const events = [];
  assert.equal(
    new TextDecoder().decode(
      await readSource(blob, 3, (...args) => events.push(args)),
    ),
    "abc",
  );
  assert.deepEqual(events, [
    [0, 3],
    [3, 3],
  ]);
  await assert.rejects(readSource(blob, 2), /size limit/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    readSource(blob, 3, () => {}, controller.signal),
    { name: "AbortError" },
  );
});
