import StlViewer from "../../build/viewstl.js";
import { cubePositions } from "./fixtures.js";
const out = document.getElementById("results"),
  container = document.getElementById("test-viewer");
let viewer;
const assert = (v, m) => {
  if (!v) throw Error(m);
};
async function pixels() {
  const blob = await viewer.get_image_blob(),
    bitmap = await createImageBitmap(blob),
    canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  assert(viewer.renderer.gl.getError() === 0, "WebGL error");
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}
const count = (p) =>
  p.reduce((s, v, i) => s + (i % 4 === 3 && v > 0 ? 1 : 0), 0);
const mass = (p) => p.reduce((s, v, i) => s + (i % 4 === 3 ? v : 0), 0);
const diff = (a, b) => a.reduce((s, v, i) => s + (v !== b[i] ? 1 : 0), 0);
document.getElementById("run").onclick = async () => {
  document.getElementById("run").disabled = true;
  out.textContent = "";
  let passed = 0,
    failed = 0;
  const errors = [];
  async function test(name, fn) {
    try {
      await fn();
      out.textContent += "PASS " + name + "\n";
      passed++;
    } catch (e) {
      out.textContent += "FAIL " + name + ": " + e.message + "\n";
      failed++;
    }
  }
  viewer?.dispose();
  viewer = new StlViewer(container, {
    bg_color: "transparent",
    load_error_callback: (e) => errors.push(e),
  });
  await viewer.when_ready;
  viewer.add_model({
    id: 0,
    data: { positions: cubePositions() },
    color: "#64a5b2",
  });
  await viewer.when_idle();
  viewer.set_camera_state({
    position: { x: 0, y: 0, z: 6 },
    target: { x: 0, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
  });
  let solid;
  await test("Solid renders without derived arrays", async () => {
    solid = await pixels();
    assert(count(solid) > 10000, "empty render");
    const g = viewer.models[0].geometry;
    assert(!g.edges && !g.wire && !g.smoothNormals, "eager geometry");
  });
  await test("Mesh overlay changes pixels without allocating edge or wire arrays", async () => {
    viewer.set_display(0, "mesh");
    const p = await pixels();
    assert(diff(p, solid) > 500, "missing lines");
    const g = viewer.models[0].geometry;
    assert(!g.edges && !g.wire && !g.smoothNormals, "mesh copied");
  });
  await test("Studio highlights change the surface while retaining its silhouette", async () => {
    viewer.set_display(0, "studio");
    const p = await pixels();
    assert(
      diff(p, solid) > 1000 && count(p) === count(solid),
      "studio appearance",
    );
  });
  await test("X-ray renders translucent pixels", async () => {
    viewer.set_display(0, "xray");
    const p = await pixels();
    assert(
      count(p) > 10000 && mass(p) < mass(solid) * 0.8,
      "transparency missing",
    );
  });
  await test("Edges and wireframe produce distinct output and smooth remains independent", async () => {
    viewer.set_display(0, "edges");
    await viewer.when_idle();
    assert(viewer.models[0].geometry.edges.length === 72, "cube edges");
    assert(diff(await pixels(), solid) > 200, "no edge overlay");
    viewer.set_smooth(0, true);
    await viewer.when_idle();
    assert(
      viewer.get_model_info(0).display === "edges" &&
        viewer.get_model_info(0).smooth_shading,
      "separate shading",
    );
    await pixels();
    viewer.set_display(0, "wireframe");
    await viewer.when_idle();
    assert(count(await pixels()) < count(solid) / 4, "wireframe filled");
    viewer.set_display(0, "flat");
    await viewer.when_idle();
  });
  await test("Section removes half the rendered model; flip keeps the opposite side", async () => {
    viewer.set_section(0, { axis: "x", position: 0.5 });
    const a = await pixels();
    assert(
      count(a) > count(solid) * 0.45 && count(a) < count(solid) * 0.55,
      "half cut",
    );
    viewer.set_section(0, { axis: "x", position: 0.5, flip: true });
    const b = await pixels();
    assert(
      Math.abs(count(a) - count(b)) < 20 && diff(a, b) > count(solid),
      "flip",
    );
    viewer.set_section(0, null);
    assert(diff(await pixels(), solid) === 0, "reset cut");
  });
  await test("All section axes and endpoints render without errors", async () => {
    for (const axis of ["x", "y", "z"])
      for (const position of [0, 0.25, 1]) {
        viewer.set_section(0, { axis, position });
        await pixels();
      }
    viewer.set_section(0, null);
  });
  await test("Face orientation uses distinct front and back colors", async () => {
    viewer.clean();
    const positions = [
      -2, -1, 0, -0.2, -1, 0, -1, 1, 0, 0.2, -1, 0, 1, 1, 0, 2, -1, 0,
    ];
    viewer.add_model({ id: 0, data: { positions }, display: "orientation" });
    await viewer.when_idle();
    viewer.set_camera_state({
      position: { x: 0, y: 0, z: 7 },
      target: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 1, z: 0 },
    });
    const p = await pixels();
    let red = 0,
      blue = 0;
    for (let i = 0; i < p.length; i += 4)
      if (p[i + 3]) {
        if (p[i] > p[i + 2] * 1.5) red++;
        if (p[i + 2] > p[i] * 1.5) blue++;
      }
    assert(red > 1000 && blue > 1000, "orientation colors");
  });
  await test("VSJ and VSB round trip new appearance and section without modifying triangles", async () => {
    viewer.set_view(0, { display: "studio", smooth_shading: true });
    viewer.set_section(0, { axis: "y", position: 0.3, flip: true });
    await viewer.when_idle();
    const before = viewer.get_model_info(0),
      scene = viewer.get_vsj(true);
    assert(
      scene.models[0].display === "studio" &&
        scene.models[0].smooth_shading &&
        scene.models[0].section.position === 0.3,
      "VSJ",
    );
    const blob = await viewer.get_vsb_blob();
    viewer.clean();
    viewer.load_vsb(new File([blob], "views.vsb"));
    await viewer.when_idle();
    const after = viewer.get_model_info(0);
    assert(
      after.display === before.display &&
        after.smooth_shading &&
        JSON.stringify(after.section) === JSON.stringify(before.section) &&
        after.triangles === 2,
      "VSB",
    );
    await pixels();
  });
  await test("View changes and section survive graphics context restoration", async () => {
    const ext = viewer.renderer.gl.getExtension("WEBGL_lose_context");
    const event = (name) =>
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(name + " timeout")), 4000);
        viewer.canvas.addEventListener(name, () => {clearTimeout(timeout); resolve();}, { once: true });
      });
    let done = event("webglcontextlost");
    ext.loseContext();
    await done;
    // Let the loss event finish dispatching before requesting restoration.
    await new Promise(resolve => setTimeout(resolve, 100));
    done = event("webglcontextrestored");
    ext.restoreContext();
    await done;
    assert(count(await pixels()) > 0, "context restore");
  });
  await test("Repeated switching and cleanup release GPU buffers", async () => {
    for (let i = 0; i < 3; i++)
      for (const mode of [
        "edges",
        "mesh",
        "xray",
        "studio",
        "orientation",
        "wireframe",
        "flat",
      ]) {
        viewer.set_display(0, mode);
        await viewer.when_idle();
        await pixels();
      }
    viewer.clean();
    assert(viewer.renderer.liveBuffers === 0, "buffer leak");
    assert(errors.length === 0, errors.join("; "));
    viewer.dispose();
  });
  out.textContent += `RESULT: ${passed} passed, ${failed} failed. Errors: ${JSON.stringify(errors)}`;
  document.getElementById("run").disabled = false;
};
