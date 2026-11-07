import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
test("ES module import is safe without DOM or WebGL globals", async () => {
  const {
    default: Viewer,
    StlViewer,
    mountViewstlApp,
  } = await import("../../build/viewstl.js");
  assert.equal(Viewer, StlViewer);
  const manifest = JSON.parse(
    await readFile(new URL("../../package.json", import.meta.url), "utf8"),
  );
  assert.equal(Viewer.version, manifest.version);
  assert.match(Viewer.workerURL, /viewstl.worker.js$/);
  assert.equal(typeof mountViewstlApp, "function");
  assert.throws(() => mountViewstlApp(null), /root is required/);
});
test("CommonJS import is SSR safe and exports same constructor", () => {
  const {
    StlViewer,
    default: Viewer,
    mountViewstlApp,
  } = createRequire(import.meta.url)("../../build/viewstl.cjs");
  assert.equal(Viewer, StlViewer);
  assert.equal(typeof mountViewstlApp, "function");
});
test("classic script contains no Three.js, XML or ZIP library runtime", async () => {
  const code = await readFile("build/stl_viewer.min.js", "utf8");
  assert.ok(!code.includes("SaxesParser"));
  assert.ok(!code.includes("JSZip"));
  assert.ok(!code.includes("WebGLRenderer"));
  assert.ok(!code.includes("fflate"));
});
