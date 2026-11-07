import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryPolicy, estimateFile } from "../../src/memory-policy.js";
test("budget uses exactly half the reported estimate and a conservative fallback", () => {
  for (const ram of [0.25, 0.5, 1, 2, 4, 8, 16, 32]) {
    const p = memoryPolicy(ram);
    assert.equal(p.budget, (ram * 1024 ** 3) / 2);
    assert.equal(p.limits.max_memory_bytes, p.budget);
    assert.ok(p.limits.max_triangles > 0);
    assert.ok(p.limits.max_file_bytes < p.budget);
  }
  for (const missing of [undefined, null, NaN, 0, Infinity, 512]) {
    assert.equal(memoryPolicy(missing).budget, 1024 ** 3);
    assert.equal(memoryPolicy(missing).reported, false);
  }
});
test("large binary STL preflight reads only its header and includes expanded geometry", async () => {
  const count = 6_000_000,
    header = new ArrayBuffer(84);
  new DataView(header).setUint32(80, count, true);
  const file = {
    name: "large.stl",
    size: 84 + count * 50,
    slice(a, b) {
      assert.equal(a, 0);
      assert.equal(b, 84);
      return new Blob([header]);
    },
  };
  const estimated = await estimateFile(file);
  assert.equal(estimated, 64 * 1024 ** 2 + count * 224);
  assert.ok(estimated < memoryPolicy(8).budget);
  assert.ok(estimated > memoryPolicy(2).budget);
});

test("CAD admission includes topology overhead for every supported alias", async () => {
  for (const ext of ["step", "STP", "iges", "IGS"]) {
    assert.equal(
      await estimateFile({ name: "model." + ext, size: 1000 }),
      128 * 1024 ** 2 + 40000,
    );
    assert.ok(
      (await estimateFile({ name: "large." + ext, size: 30 * 1024 ** 2 })) >
        memoryPolicy(2).budget,
    );
  }
});
