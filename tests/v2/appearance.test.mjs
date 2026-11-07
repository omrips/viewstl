import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateView,
  validateSection,
  viewFeatures,
  sectionPlane,
} from "../../src/appearance.js";
import {
  deriveGeometry,
  finishGeometry,
  intersectGeometry,
  DEFAULT_LIMITS,
} from "../../src/geometry.js";
import { StlViewer } from "../../src/viewer.js";
import { MEMORY_OVERHEAD } from "../../src/memory.js";
import { cubePositions } from "./fixtures.js";

test("new views validate and shader-only modes need no derived geometry", () => {
  for (const display of ["flat", "mesh", "xray", "studio", "orientation"]) {
    const f = viewFeatures(validateView(display, false));
    assert.equal(f.smooth || f.wire || f.edges, false);
  }
  assert.throws(() => validateView("bogus", false), /display/);
  assert.throws(() => validateView("flat", 1), /boolean/);
  assert.equal(viewFeatures(validateView("wireframe", true)).smooth, false);
  assert.equal(viewFeatures(validateView("edges", false)).edgeAngle, 30);
});
test("section validates independent copies and clips picking on either side", () => {
  for (const bad of [
    { axis: "q", position: 0.5 },
    { axis: "x", position: NaN },
    { axis: "z", position: 1.1 },
    { axis: "y", position: 0.5, flip: 1 },
  ])
    assert.throws(() => validateSection(bad));
  const g = finishGeometry(
    new Float32Array(cubePositions()),
    null,
    DEFAULT_LIMITS,
  );
  const input = { axis: "x", position: 0.5 },
    section = validateSection(input);
  input.position = 1;
  assert.equal(section.position, 0.5);
  const plane = sectionPlane(g.bounds, section);
  assert.equal(intersectGeometry(g, [0.5, 0, 5], [0, 0, -1], plane), Infinity);
  assert.equal(intersectGeometry(g, [-0.5, 0, 5], [0, 0, -1], plane), 4);
  assert.equal(
    intersectGeometry(
      g,
      [0.5, 0, 5],
      [0, 0, -1],
      sectionPlane(g.bounds, { ...section, flip: true }),
    ),
    4,
  );
});
test("feature-edge angle suppresses shallow creases but retains sharp boundaries", () => {
  const p = new Float32Array([
    0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, -1, 0.1,
  ]);
  assert.equal(
    deriveGeometry(p, { edges: true, edgeAngle: 1 }).edges.length,
    30,
  );
  assert.equal(
    deriveGeometry(p, { edges: true, edgeAngle: 30 }).edges.length,
    24,
  );
});
function fakeViewer(pool) {
  const v = Object.create(StlViewer.prototype),
    m = {
      id: 0,
      display: "flat",
      smooth_shading: false,
      geometry: finishGeometry(
        new Float32Array(cubePositions()),
        null,
        DEFAULT_LIMITS,
      ),
    };
  Object.assign(v, {
    _models: new Map([[0, m]]),
    _derived: new Set(),
    _generation: 0,
    limits: DEFAULT_LIMITS,
    renderer: { remove() {} },
    _invalidate() {},
    _error(e) {
      this.error = e.message;
      return null;
    },
    _pool: pool,
  });
  return { v, m };
}
test("rejected memory budget keeps the previous view and never starts a worker", () => {
  const { v, m } = fakeViewer({
    run() {
      throw Error("worker must not run");
    },
  });
  v.limits = {
    ...DEFAULT_LIMITS,
    max_memory_bytes: MEMORY_OVERHEAD + 12 * 224,
  };
  v.set_display(0, "edges");
  assert.match(v.error, /safety budget/);
  assert.equal(m.display, "flat");
});
test("worker failure preserves appearance and settles pending view work", async () => {
  const { v, m } = fakeViewer({
    run() {
      return Promise.reject(Error("worker failed"));
    },
  });
  v.set_display(0, "edges");
  await Promise.allSettled([...v._derived]);
  assert.equal(m.display, "flat");
  assert.equal(v._derived.size, 0);
  assert.match(v.error, /worker failed/);
});
test("a late view calculation cannot override a newer shader-only selection", async () => {
  let finish;
  const { v, m } = fakeViewer({
    run() {
      return new Promise((r) => (finish = r));
    },
  });
  v.set_display(0, "edges");
  v.set_display(0, "studio");
  finish({ edges: new Float32Array(72), edgeAngle: 30 });
  await Promise.allSettled([...v._derived]);
  assert.equal(m.display, "studio");
  assert.equal(v._derived.size, 0);
});
