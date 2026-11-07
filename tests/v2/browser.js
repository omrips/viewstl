import StlViewer from "../../build/viewstl.js";
import { binary, cubePositions, torusPositions } from "./fixtures.js";
const out = document.getElementById("results"),
  container = document.getElementById("test-viewer");
let viewer;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () =>
  new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
const close = (a, b) => assert(Math.abs(a - b) < 1e-5, `${a} != ${b}`);
const file = () => new File([binary(cubePositions())], "cube.stl");
function log(text) {
  out.textContent += text + "\n";
}
async function fresh(options = {}) {
  viewer?.dispose();
  viewer = new StlViewer(container, { ...options });
  await viewer.when_ready;
  return viewer;
}
document.getElementById("run").onclick = async () => {
  out.textContent = "";
  let passed = 0,
    failed = 0;
  const errors = [];
  const test = async (name, fn) => {
    try {
      await fn();
      log(`PASS ${name}`);
      passed++;
    } catch (e) {
      log(`FAIL ${name}: ${e.message}`);
      failed++;
    }
  };
  await test("classic script entry point, worker URL and global constructor", async () => {
    const script = document.createElement("script");
    script.src = "../../build/stl_viewer.min.js";
    await new Promise((r, j) => {
      script.onload = r;
      script.onerror = j;
      document.head.append(script);
    });
    const other = document.createElement("div");
    other.style.cssText = "width:200px;height:150px";
    container.append(other);
    const legacyStyle = new globalThis.StlViewer(other, {
      models: [{ id: 0, local_file: file() }],
    });
    await legacyStyle.when_idle();
    assert(legacyStyle.get_model_info(0).triangles === 12, "classic loading");
    legacyStyle.dispose();
    other.remove();
    script.remove();
  });
  await test("callbacks, zero ID, progress, worker parsing and first render", async () => {
    const events = [];
    await fresh({
      ready_callback: () => events.push("ready"),
      model_loaded_callback: (id) => events.push(`model:${id}`),
      all_loaded_callback: () => events.push("all"),
      loading_progress_callback: () => events.push("progress"),
      load_error_callback: (e) => errors.push(e),
    });
    viewer.add_model({ id: 0, local_file: file() });
    await viewer.when_idle();
    await frame();
    assert(viewer.get_model_info(0).triangles === 12, "triangles");
    assert(
      events[0] === "ready" &&
        events.includes("model:0") &&
        events.includes("progress") &&
        events.includes("all"),
      "callbacks",
    );
    assert(
      events.indexOf("all") < events.indexOf("model:0"),
      "legacy final callback order",
    );
    assert(viewer.renderer.liveBuffers > 0, "GPU upload");
    assert(viewer.renderer.gl.getError() === 0, "GL error");
  });
  await test("idle renderer draws no additional frames", async () => {
    await frame();
    const frames = viewer.renderer.frames;
    await sleep(160);
    assert(viewer.renderer.frames === frames, "render loop kept running");
  });
  await test("native appearance modes, edges, opacity zero, transforms and units", async () => {
    for (const display of ["smooth", "wireframe", "flat"]) {
      viewer.set_display(0, display);
      await viewer.when_idle();
      await frame();
      assert(viewer.get_model_info(0).display === display, "mode");
      assert(viewer.renderer.gl.getError() === 0, "mode GL error");
    }
    viewer.set_edges(0, true);
    await viewer.when_idle();
    await frame();
    assert(viewer._models.get(0).geometry.edges.length === 72, "edges");
    viewer.set_opacity(0, 0);
    assert(viewer.get_model_info(0).opacity === 0, "zero opacity");
    viewer.set_opacity(0, 0.6);
    viewer.set_color(0, "#55aaee");
    viewer.set_position(0, 0, 2, 3);
    viewer.set_scale(0, 2, 3, 4);
    viewer.rotate(0, 0, 0.2, 0);
    const info = viewer.get_model_info(0);
    close(info.volume, 192);
    close(info.area, 208);
    viewer.set_model_units(0, "inch", true);
    close(viewer.get_model_info(0).volume, 192);
    viewer.set_model_units(0, "mm", true);
    close(viewer.get_model_info(0).dims.x, 4);
  });
  await test("camera state, picking and controls can be disabled", async () => {
    viewer.set_position(0, 0, 0, 0);
    viewer.set_scale(0, 1);
    viewer.set_rotation(0, 0, 0, 0);
    viewer.set_opacity(0, 1);
    viewer.set_camera_state({
      position: { x: 0, y: 0, z: 5 },
      up: { x: 0, y: 1, z: 0 },
      target: { x: 0, y: 0, z: 0 },
    });
    let clicked = null;
    viewer.set_on_model_mouseclick((id, e, d) => (clicked = { id, d }));
    const rect = viewer.canvas.getBoundingClientRect();
    viewer.canvas.dispatchEvent(
      new MouseEvent("dblclick", {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        bubbles: true,
      }),
    );
    assert(clicked?.id === 0, "pick id");
    close(clicked.d, 4);
    viewer.controls.enabled = false;
    clicked = null;
    viewer.canvas.dispatchEvent(
      new MouseEvent("dblclick", {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        bubbles: true,
      }),
    );
    assert(clicked === null, "disabled controls");
    viewer.controls.enabled = true;
  });
  await test("animation ends exactly and releases the render loop", async () => {
    const previous = viewer.animation_complete_callback;
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Animation completion timeout")), 5000);
        viewer.animation_complete_callback = (id) => {
          if (id === 0) { clearTimeout(timer); resolve(); }
        };
        viewer.animate_model(0, { exact: { x: 10, rotationz: 1, msec: 60 } });
      });
    } finally { viewer.animation_complete_callback = previous; }
    close(viewer.get_model_info(0).position.x, 10);
    close(viewer.get_model_info(0).rotation.z, 1);
    assert(viewer.get_model_animation_state(0).status === "completed", "animation ended");
    await frame();
    const frames = viewer.renderer.frames;
    await sleep(80);
    assert(frames === viewer.renderer.frames, "animation idle");
  });
  await test("VSB compressed archive round trip retains scale, camera and colors", async () => {
    viewer.set_scale(0, 2, 3, 4);
    const before = viewer.get_model_info(0),
      camera = viewer.get_camera_state(),
      blob = await viewer.get_vsb_blob();
    viewer.clean();
    viewer.load_vsb(new File([blob], "roundtrip.vsb"));
    await viewer.when_idle();
    assert(viewer.models_count === 1, "VSB count");
    const after = viewer.get_model_info(0);
    close(after.volume, before.volume);
    close(after.dims.x, before.dims.x);
    assert(after.color === before.color, "VSB color");
    assert(
      JSON.stringify(viewer.get_camera_state()) === JSON.stringify(camera),
      "VSB camera",
    );
  });
  await test("screenshot exports a nonempty PNG without preserveDrawingBuffer", async () => {
    const blob = await viewer.get_image_blob();
    assert(blob.type === "image/png" && blob.size > 1000, "PNG");
    const bitmap = await createImageBitmap(blob);
    assert(bitmap.width > 0, "image width");
    bitmap.close();
  });
  await test("VSJ relative URLs, multi-model batches and old VSB scene files", async () => {
    viewer.clean();
    viewer.load_vsj("data/url-scene.vsj");
    await viewer.when_idle();
    assert(viewer.models_count === 2, "VSJ models");
    assert(viewer.get_model_info(5)?.triangles === 12, "relative STL URL");
    close(viewer.get_model_info(6).position.x, 4);
    viewer.clean();
    viewer.load_vsb("data/legacy-multi.vsb");
    await viewer.when_idle();
    assert(viewer.models_count === 3, "legacy VSB model count");
    viewer.clean();
    viewer.add_model({ id: 0, local_file: file() });
    await viewer.when_idle();
  });
  await test("3MF and OBJ loaders run through the real module worker", async () => {
    viewer.clean();
    viewer.add_models([
      { id: 0, filename: "data/sample.3mf" },
      { id: 1, filename: "data/sample.obj" },
    ]);
    await viewer.when_idle();
    assert(viewer.get_model_info(0)?.triangles === 1, "worker 3MF");
    assert(viewer.get_model_info(1)?.triangles === 2, "worker OBJ");
    viewer.clean();
    viewer.add_model({ id: 0, local_file: file() });
    await viewer.when_idle();
  });
  await test("missing native Three mesh bridge fails explicitly", async () => {
    const before = errors.length;
    assert(viewer.get_model_mesh(0) === null, "no fake Mesh");
    assert(
      errors.length === before + 1 && errors.at(-1).includes("requires"),
      "bridge error",
    );
    errors.pop();
  });
  await test("legacy renderer API comparison and optional mesh bridge", async () => {
    const iframe = document.createElement("iframe");
    iframe.src = "legacy.html";
    document.body.append(iframe);
    await new Promise((r, j) => {
      iframe.onload = r;
      iframe.onerror = j;
    });
    let old;
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Legacy load timeout")),
          15000,
        );
        old = new iframe.contentWindow.StlViewer(
          iframe.contentDocument.getElementById("legacy"),
          {
            load_three_files: "/legacy/v1/build/",
            models: [{ id: 0, local_file: file() }],
            model_loaded_callback: () => {
              clearTimeout(timer);
              resolve();
            },
            load_error_callback: reject,
          },
        );
      });
      viewer.clean();
      viewer.add_model({ id: 0, local_file: file() });
      await viewer.when_idle();
      for (const v of [old, viewer]) {
        v.set_scale(0, 2, 3, 4);
        v.set_position(0, 2, 3, 4);
        v.set_color(0, "#abcdef");
        v.set_opacity(0, 0.5);
      }
      const a = old.get_model_info(0),
        b = viewer.get_model_info(0);
      for (const key of ["volume", "area", "triangles", "opacity"])
        close(a[key], b[key]);
      for (const axis of ["x", "y", "z"])
        close(a.position[axis], b.position[axis]);
      // Legacy caches dimensions before scaling; v2 deliberately fixes those stale values.
      close(a.dims.x, 2);
      close(b.dims.x, 4);
      close(b.dims.y, 6);
      close(b.dims.z, 8);
      assert(
        old.get_stl_bin(0).byteLength === viewer.get_stl_bin(0).byteLength,
        "STL export shape",
      );
      viewer.options.three = iframe.contentWindow.THREE;
      const mesh = viewer.get_model_mesh(0);
      assert(mesh?.isMesh, "Three Mesh");
      viewer.add_model({ id: 1, mesh });
      await viewer.when_idle();
      assert(viewer.get_model_info(1).triangles === 12, "mesh import");
      mesh.geometry.dispose();
      mesh.material.dispose();
    } finally {
      old?.dispose();
      iframe.remove();
    }
  });
  await test("load failure settles the session; remove/clean cancel pending work", async () => {
    viewer.clean();
    const count = errors.length;
    viewer.add_model({ id: 0, local_file: new File(["broken"], "broken.stl") });
    await viewer.when_idle();
    assert(
      viewer.models_count === 0 && errors.length === count + 1,
      "load error",
    );
    errors.pop();
    viewer.add_model({ id: 0, local_file: file() });
    viewer.remove_model(0);
    viewer.add_model({ id: 0, local_file: file() });
    await viewer.when_idle();
    assert(viewer.get_model_info(0)?.triangles === 12, "reused ID race");
    viewer.clean();
    await frame();
    assert(viewer.renderer.liveBuffers === 0, "GPU buffer leak");
    assert(viewer._pool.active.size === 0, "worker leak");
  });
  await test("context loss/restoration and disposal free resources", async () => {
    viewer.add_model({ id: 0, local_file: file() });
    await viewer.when_idle();
    await frame();
    const ext = viewer.renderer.gl.getExtension("WEBGL_lose_context");
    assert(!!ext, "context loss extension");
    ext.loseContext();
    await sleep(100);
    ext.restoreContext();
    await sleep(250);
    await frame();
    assert(!viewer.renderer.lost && viewer.renderer.liveBuffers > 0, "restore");
    viewer.dispose();
    assert(
      container.querySelectorAll("canvas").length === 0,
      "owned canvas removal",
    );
    assert(viewer.renderer.liveBuffers === 0, "disposed buffers");
    assert(viewer._pool.active.size === 0, "disposed workers");
    viewer.dispose();
  });
  await test("initialization failure reports a message and dispose preserves siblings", async () => {
    const original = HTMLCanvasElement.prototype.getContext,
      sibling = document.createElement("span");
    sibling.textContent = "Keep this sibling";
    container.append(sibling);
    let failure;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : original.call(this, type, ...args);
    };
    try {
      const unsupported = new StlViewer(container, {
        load_error_callback: (e) => (failure = e),
      });
      await unsupported.when_ready.catch(() => {});
      assert(failure?.includes("WebGL2"), "initialization error callback");
      assert(
        container
          .querySelector("[role=status]")
          ?.textContent.includes("WebGL2"),
        "visible failure",
      );
      unsupported.dispose();
      assert(container.contains(sibling), "sibling removed");
    } finally {
      HTMLCanvasElement.prototype.getContext = original;
      sibling.remove();
    }
  });
  log(
    `\nRESULT: ${passed} passed, ${failed} failed. Unexpected errors: ${JSON.stringify(errors)}`,
  );
};
document.getElementById("large").onclick = async () => {
  out.textContent = "Generating 1,000,000 triangles…\n";
  try {
    await fresh();
    const input = binary(torusPositions(1000, 500)),
      start = performance.now();
    viewer.add_model({ id: 0, local_file: new File([input], "million.stl") });
    await viewer.when_idle();
    await frame();
    log(
      `Loaded ${viewer.get_model_info(0).triangles.toLocaleString()} triangles (${(input.byteLength / 1e6).toFixed(1)} MB) in ${(performance.now() - start).toFixed(0)} ms through worker + first frames.`,
    );
    log(
      `WebGL error: ${viewer.renderer.gl.getError()}; live geometry buffers: ${viewer.renderer.liveBuffers}`,
    );
    viewer.clean();
    await frame();
    log(
      `After clean: ${viewer.renderer.liveBuffers} GPU buffers, ${viewer._pool.active.size} active workers.`,
    );
  } catch (e) {
    log(`FAIL: ${e.message}`);
  }
};
