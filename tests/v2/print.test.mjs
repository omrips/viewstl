import { test } from "node:test";
import assert from "node:assert/strict";
import { checkMesh } from "../../src/print-check.js";
import { printOptions } from "../../src/print-options.js";
import { identity } from "../../src/math.js";
import { cubePositions } from "./fixtures.js";
import { trianglesIntersect } from "../../src/print-spatial.js";
const limits = { max_memory_bytes: 1024 ** 3, max_triangles: 5_000_000 };
const run = (p = cubePositions(), options = {}, matrix = identity()) =>
  checkMesh(
    { id: 0, name: "fixture", positions: p, matrix, source_units: "mm" },
    { level: "detailed", ...options },
    limits,
  );
const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-7);
const item = (r, code) => r.checks.find((c) => c.code === code);
const reverse = (p) => {
  p = p.slice();
  for (let i = 0; i < p.length; i += 9)
    for (let k = 0; k < 3; k++)
      [p[i + 3 + k], p[i + 6 + k]] = [p[i + 6 + k], p[i + 3 + k]];
  return p;
};
const combine = (...p) => {
  const out = new Float32Array(p.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const a of p) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
};
test("almost coplanar curved-surface neighbors sharing an edge do not intersect", () => {
  const point = (u, v) => {
    const a = (u / 250) * Math.PI * 2,
      b = (v / 200) * Math.PI * 2,
      r = 23 + 8 * Math.cos(b);
    return Array.from(
      new Float32Array([r * Math.cos(a), r * Math.sin(a), 8 * Math.sin(b)]),
    ).map((x, i) => x + [31, 31, 8][i]);
  };
  const a = point(62, 183),
    b = point(63, 183),
    c = point(63, 184),
    d = point(62, 184);
  assert.equal(trianglesIntersect([a, b, c], [a, c, d], 2, 6.2e-9), 0);
  assert.equal(
    trianglesIntersect(
      [
        [0, 0, 0],
        [2, 0, 0],
        [0, 2, 0],
      ],
      [
        [0, 0, 0],
        [2, 0, 0],
        [1, 1, 0],
      ],
      2,
      1e-10,
    ),
    1,
  );
});
const cube = (s = 1, offset = [0, 0, 0]) =>
  cubePositions().map((v, i) => v * s + offset[i % 3]);
test("closed cube has validated volume; basic explicitly omits detailed checks", () => {
  const r = run();
  assert.equal(r.summary, "no_issues_found");
  close(r.volume_mm3, 8);
  assert.equal(item(r, "intersections").status, "pass");
  const basic = run(undefined, { level: "basic" });
  assert.equal(basic.volume_valid, false);
  assert.equal(basic.summary, "incomplete");
  assert.equal(item(basic, "intersections").status, "not_run");
});
test("open boundary, duplicates, degenerates and reversed winding have separate diagnostics", () => {
  assert.equal(item(run(cube().slice(9)), "boundary_edges").count, 3);
  assert.equal(
    item(run(combine(cube(), cube().slice(0, 9))), "duplicate_faces").count,
    1,
  );
  assert.equal(
    item(run(combine(cube(), new Float32Array(9))), "degenerate_faces").count,
    1,
  );
  const p = cube();
  p.set(reverse(p.slice(0, 9)), 0);
  assert.equal(item(run(p), "winding").status, "issue");
  assert.equal(item(run(reverse(cube())), "shell_orientation").status, "issue");
});
test("point-connected solids are nonmanifold at the vertex despite paired edges", () => {
  const r = run(combine(cube(), cube(1, [2, 2, 2])));
  assert.equal(item(r, "nonmanifold_edges").count, 0);
  assert.equal(item(r, "nonmanifold_vertices").count, 1);
  assert.equal(r.volume_valid, false);
});
test("disconnected valid solids are informational; nested cavities use alternating orientation", () => {
  const r = run(combine(cube(), cube(1, [4, 0, 0])));
  assert.equal(item(r, "components").count, 2);
  assert.equal(r.summary, "no_issues_found");
  close(r.volume_mm3, 16);
  const cavity = run(combine(cube(2), reverse(cube())));
  assert.equal(cavity.volume_valid, true);
  close(cavity.volume_mm3, 56);
  const wrong = run(combine(cube(2), cube()));
  assert.equal(item(wrong, "shell_orientation").status, "issue");
});
test("intersecting shells and coplanar overlap fail; normal adjacent faces do not", () => {
  assert.equal(
    item(run(combine(cube(), cube(1, [1, 0.3, 0.2]))), "intersections").status,
    "issue",
  );
  const overlap = new Float32Array([
    0, 0, 0, 2, 0, 0, 0, 2, 0, 0.2, 0.2, 0, 1, 0.2, 0, 0.2, 1, 0,
  ]);
  assert.equal(item(run(overlap), "intersections").status, "issue");
  assert.equal(item(run(), "intersections").count, 0);
});
test("numerical stability under large translation; physical transforms affect size/volume", () => {
  const m = identity();
  m[12] = 1e8;
  m[13] = -1e8;
  m[14] = 1e8;
  const r = run(undefined, {}, m);
  close(r.volume_mm3, 8);
  assert.equal(r.summary, "no_issues_found");
  m[0] = 2;
  m[5] = 3;
  m[10] = 4;
  const scaled = run(undefined, {}, m);
  assert.deepEqual(scaled.dimensions_mm, [4, 6, 8]);
  close(scaled.volume_mm3, 192);
});
test("tiny gaps are not welded closed; near-degenerate triangles are warnings", () => {
  const p = cube();
  p[0] += 1e-5;
  assert.equal(item(run(p), "boundary_edges").status, "issue");
  const thin = combine(
    cube(),
    new Float32Array([0, 0, 0, 1, 0, 0, 1, 1e-12, 0]),
  );
  assert.equal(item(run(thin), "near_degenerate_faces").status, "issue");
});
test("FDM estimates expose thresholds, virtual bed and sampled thickness limits", () => {
  const r = run(undefined, {
    profile: {
      technology: "fdm",
      build_volume_mm: [1, 3, 3],
      min_wall_mm: 3,
      overhang_degrees: 45,
    },
  });
  assert.equal(item(r, "build_volume").status, "issue");
  assert.equal(item(r, "bed_contact").area_mm2, 4);
  assert.equal(item(r, "overhangs").count, 0);
  assert.equal(item(r, "thin_walls").status, "issue");
  assert.equal(item(r, "thin_walls").estimated, true);
  assert.equal(item(r, "thin_walls").minimum_sampled_mm, 2);
  const safe = run(undefined, {
    profile: { technology: "fdm", min_wall_mm: 1 },
  });
  assert.equal(item(safe, "thin_walls").status, "inconclusive");
});
test("unitless geometry cannot claim physical-size validation without confirmation", () => {
  const model = {
    id: 0,
    positions: cube(),
    matrix: identity(),
    source_units: null,
  };
  const opts = {
    level: "detailed",
    profile: { technology: "fdm", build_volume_mm: [10, 10, 10] },
  };
  const r = checkMesh(model, opts, limits);
  assert.equal(item(r, "units").status, "inconclusive");
  assert.equal(item(r, "build_volume").status, "inconclusive");
  assert.equal(
    item(
      checkMesh(model, { ...opts, units_confirmed: true }, limits),
      "build_volume",
    ).status,
    "pass",
  );
});
test("invalid options and memory limits reject before expensive work", () => {
  for (const o of [
    { level: "magic" },
    { profile: { technology: "resin" } },
    { profile: { technology: "fdm", min_wall_mm: 0 } },
    { profile: { technology: "fdm", build_volume_mm: [2] } },
    { max_time_ms: Infinity },
  ])
    assert.throws(() => printOptions(o));
  assert.throws(
    () =>
      checkMesh(
        { positions: cube(), matrix: identity() },
        {},
        { max_memory_bytes: 1024 },
      ),
    /memory/,
  );
});
test("time limits return incomplete results and highlights are bounded without changing input", () => {
  const p = combine(
      ...Array.from({ length: 1000 }, (_, i) => cube(1, [i * 3, 0, 0])),
    ),
    original = p.slice();
  const r = run(p, { max_time_ms: 0.001 });
  assert.equal(r.limit_reason, "time");
  assert.equal(r.summary, "incomplete");
  assert.deepEqual(p, original);
  const duplicates = run(
    combine(...Array.from({ length: 200 }, () => cube())),
    { level: "basic" },
  );
  for (const c of duplicates.checks) {
    assert.ok(c.triangle_ids.length <= 128);
    assert.ok(c.edge_vertices.length <= 1536);
  }
});
