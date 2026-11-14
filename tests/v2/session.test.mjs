import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ViewerSession } from "../../src/session.js";

test("sessions are lazy, isolated and return detached settings", () => {
  const a = new ViewerSession(null),
    b = new ViewerSession(null);
  assert.equal(a.viewer, null);
  const policy = a.memoryPolicy;
  policy.limits.max_file_bytes = 1;
  assert.notEqual(a.memoryPolicy.limits.max_file_bytes, 1);
  a.setGrid(true, 2, -3);
  a.grid.height = 100;
  assert.equal(a.grid.height, -3);
  assert.equal(b.grid.enabled, false);
  assert.throws(() => a.setGrid(true, 0, 0), /spacing/);
  assert.throws(() => a.setArrangement("invalid"), /arrangement/);
  a.dispose();
  a.dispose();
  b.dispose();
  assert.throws(() => a.getModels(), /disposed/);
  assert.throws(() => a.openFiles([]), /disposed/);
  assert.throws(
    () => new ViewerSession(null, { viewer_options: { models: [] } }),
    /openFiles/,
  );
});

test("invalid inputs and memory admission report structured errors without creating WebGL", async () => {
  const events = [];
  const session = new ViewerSession(null, {
    viewer_options: { max_memory_bytes: 1024 },
    on_event: (e) => events.push(e),
  });
  await session.openFiles([
    { name: "unsupported.exe", size: 1 },
    { name: "empty.stl", size: 0 },
    { name: "large.stl", size: 2000 },
  ]);
  assert.deepEqual(
    events.filter((e) => e.type === "error").map((e) => e.code),
    ["unsupported-format", "empty-file", "memory-budget"],
  );
  assert.equal(session.viewer, null);
  assert.equal(session.busy, false);
  assert.throws(
    () => session.openURL("https://example.com/model.stl"),
    /not configured/,
  );
  session.dispose();
});

test("queue handles completion callback reentry, cancellation and late header reads", async () => {
  const errors = [];
  let reentered = false;
  const session = new ViewerSession(null, {
    viewer_options: { max_memory_bytes: 1024 },
    on_event: (event) => {
      if (event.type === "error") errors.push(event.source);
      if (event.type === "busy" && !event.busy && !reentered) {
        reentered = true;
        void session.openFiles([{ name: "second.stl", size: 2000 }]);
      }
    },
  });
  await session.openFiles([{ name: "first.stl", size: 2000 }]);
  assert.deepEqual(errors, ["first.stl", "second.stl"]);
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const pending = session.openFiles([
    { name: "slow.stl", size: 84, slice: () => ({ arrayBuffer: () => gate }) },
  ]);
  await Promise.resolve();
  session.cancelLoading();
  release(new ArrayBuffer(84));
  await pending;
  assert.equal(errors.length, 2);
  assert.equal(session.viewer, null);
  session.dispose();
});

test("published browser entries exclude the site controller and its required page controls", async () => {
  for (const name of [
    "viewstl.js",
    "viewstl.cjs",
    "viewstl.min.js",
    "stl_viewer.min.js",
  ]) {
    const code = await readFile("build/" + name, "utf8");
    for (const forbidden of [
      "mountViewstlApp",
      "save-dialog",
      "print-panel",
      "scene-panel",
      "animation-details",
      "data-viewstl-shortcut",
    ])
      assert.ok(
        !code.includes(forbidden),
        name + " contains website UI: " + forbidden,
      );
    assert.match(code.split("\n")[0], /^\/\/=========== Stl Viewer v/);
  }
});
