import StlViewer from "../../build/viewstl.js";
import { cubePositions, torusPositions, binary } from "./fixtures.js";
const $ = (id) => document.getElementById(id),
  sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () =>
  new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};
const close = (a, b) => assert(Math.abs(a - b) < 1e-5, `${a} != ${b}`);
let viewer,
  errors = [],
  events = [];
async function setup(options = {}) {
  viewer?.dispose();
  errors = [];
  events = [];
  viewer = new StlViewer($("test-viewer"), {
    center_models: false,
    max_memory_bytes: 512 * 1024 ** 2,
    load_error_callback: (e) => errors.push(e),
    animation_state_callback: (id, state, reason) =>
      events.push({ id, state, reason }),
    ...options,
  });
  await viewer.when_ready;
  return viewer;
}
async function add(id = 0, extra = {}) {
  viewer.add_model({
    id,
    filename: "cube.stl",
    data: { positions: cubePositions() },
    ...extra,
  });
  await viewer.when_idle();
  await frame();
  return viewer._models.get(id);
}
function pose(m) {
  return [
    m.x,
    m.y,
    m.z,
    m.rotationx,
    m.rotationy,
    m.rotationz,
    m.scalex,
    m.scaley,
    m.scalez,
  ];
}
const spin = { delta: { rotationz: 1, msec: 1000, loop: true } };
$("run").onclick = async () => {
  $("run").disabled = true;
  $("results").textContent = "";
  let passed = 0,
    failed = 0;
  const test = async (name, fn) => {
    try {
      await fn();
      $("results").textContent += `PASS ${name}\n`;
      passed++;
    } catch (e) {
      $("results").textContent += `FAIL ${name}: ${e.message}\n`;
      failed++;
    }
  };
  await test("Constructor animation, mixed durations, final pose, idle and one completion event", async () => {
    await setup();
    const m = await add(0, {
      animation: {
        delta: { x: 5, msec: 80 },
        exact: { scale: 2, rotationz: 1, msec: 160 },
      },
    });
    await sleep(260);
    close(m.x, 5);
    close(m.scalex, 2);
    close(m.rotationz, 1);
    assert(
      viewer.get_model_animation_state(0).status === "completed",
      "not complete",
    );
    assert(
      events.filter((e) => e.reason === "completed").length === 1,
      "completion count",
    );
    await frame();
    const frames = viewer.renderer.frames;
    await sleep(100);
    assert(viewer.renderer.frames === frames, "render loop not idle");
  });
  await test("Legacy combination, independent models, no geometry reupload and manual editing", async () => {
    await setup();
    const a = await add(),
      b = await add(1, { x: 8 });
    viewer.animate_model(0, {
      delta: {
        rotationx: 1,
        rotationy: 1.1,
        rotationz: 1.2,
        msec: 1000,
        loop: true,
      },
      exact: { x: 4, scale: 2, msec: 120 },
    });
    viewer.animate_model(1, spin);
    await frame();
    const resource = viewer.renderer.resource(a, "flat"),
      positions = a.geometry.positions,
      buffers = viewer.renderer.liveBuffers;
    await sleep(240);
    close(a.x, 4);
    close(a.scalex, 2);
    assert(
      viewer.get_model_animation_state(0).tracks.length === 1,
      "finished track remains",
    );
    assert(
      viewer.renderer.resource(a, "flat") === resource &&
        a.geometry.positions === positions &&
        viewer.renderer.liveBuffers === buffers,
      "geometry was reuploaded",
    );
    viewer.set_position(0, 12);
    const p = pose(a),
      angle = b.rotationz;
    await sleep(100);
    assert(
      JSON.stringify(p) === JSON.stringify(pose(a)),
      "manual edit fought animation",
    );
    assert(b.rotationz > angle, "other model stopped");
  });
  await test("Pause/resume and stop keep the visible pose and release frame work", async () => {
    await setup();
    const m = await add();
    viewer.animate_model(0, spin);
    await sleep(120);
    viewer.pause_model_animation(0);
    const angle = m.rotationz,
      elapsed = viewer.get_model_animation_state(0).elapsed_ms;
    await frame();
    const frames = viewer.renderer.frames;
    await sleep(120);
    close(m.rotationz, angle);
    assert(viewer.renderer.frames === frames, "paused frames");
    viewer.resume_model_animation(0);
    await frame();
    assert(
      viewer.get_model_animation_state(0).elapsed_ms < elapsed + 100,
      "resume jumped",
    );
    await sleep(100);
    assert(m.rotationz > angle, "did not resume");
    viewer.animate_model(0, null);
    const stopped = pose(m);
    await sleep(100);
    assert(
      JSON.stringify(stopped) === JSON.stringify(pose(m)),
      "stop moved model",
    );
  });
  await test("Modern VSB import preserves paused scale, pivot, units and phase", async () => {
    await setup({ center_models: true });
    const positions = cubePositions().map((v, i) => v + (i % 3 === 0 ? 7 : 0));
    const m = await add(0, { data: { positions } });
    viewer.set_model_units(0, "inch", true);
    viewer.animate_model(0, {
      exact: { scale: 3, x: 8, msec: 1200 },
      delta: { rotationz: 1, msec: 1000, loop: true },
    });
    await sleep(160);
    viewer.pause_model_animation(0);
    const before = pose(m),
      dims = viewer.get_model_info(0).dims,
      elapsed = viewer.get_model_animation_state(0).elapsed_ms;
    const exported = await viewer.export_scene({ format: "vsb" });
    viewer.clean();
    viewer.set_center_models(false);
    const opened = await viewer.import_scene(
      new File([exported.blob], "animated.vsb"),
    );
    const id = opened.model_ids[0],
      restored = viewer._models.get(id);
    await frame();
    close(restored.x, before[0]);
    close(restored.rotationz, before[5]);
    close(restored.scalex, before[6] * 25.4);
    close(viewer.get_model_info(id).dims.x, dims.x);
    close(restored.center[0], 7);
    close(viewer.get_model_animation_state(id).elapsed_ms, elapsed);
    assert(
      viewer.get_model_animation_state(id).status === "paused",
      "paused state lost",
    );
    viewer.resume_model_animation(id);
    await sleep(100);
    assert(restored.rotationz > before[5], "restored playback frozen");
  });
  await test("Legacy VSB methods restore playback state without double scaling", async () => {
    viewer.pause_model_animation(viewer.models.find(Boolean).id);
    const old = viewer.models.find(Boolean),
      before = viewer.get_model_info(old.id),
      state = viewer.get_model_animation_state(old.id),
      blob = await viewer.get_vsb_blob();
    viewer.clean();
    viewer.load_vsb(new File([blob], "legacy-api.vsb"));
    await viewer.when_idle();
    const restored = viewer.models.find(Boolean);
    close(viewer.get_model_info(restored.id).dims.x, before.dims.x);
    close(
      viewer.get_model_animation_state(restored.id).elapsed_ms,
      state.elapsed_ms,
    );
    assert(
      viewer.get_model_animation_state(restored.id).status === "paused",
      "legacy API lost pause",
    );
  });
  await test("VSJ import and both loaders start all incoming animations together", async () => {
    await setup();
    const json = {
        center_models: false,
        models: [
          { filename: "cube.stl", animation: spin },
          { filename: "cube.stl", x: 5, animation: spin },
        ],
      },
      data = new File([binary(cubePositions())], "cube.stl");
    const opened = await viewer.import_scene(
      new File([JSON.stringify(json)], "group.vsj"),
      { files: [data] },
    );
    await sleep(140);
    const states = opened.model_ids.map((id) =>
      viewer.get_model_animation_state(id),
    );
    close(states[0].elapsed_ms, states[1].elapsed_ms);
    for (const id of opened.model_ids) viewer.pause_model_animation(id);
    const saved = await viewer.export_scene({ format: "vsj" });
    viewer.clean();
    await viewer.import_scene(new File([saved.blob], "saved.vsj"), {
      files: [data],
    });
    await frame();
    assert(
      viewer.models
        .filter(Boolean)
        .every(
          (m) => viewer.get_model_animation_state(m.id).status === "paused",
        ),
      "VSJ pause lost",
    );
    viewer.clean();
    const legacy = {
      models: json.models.map((m) => ({ ...m, filename: "./data/cube.stl" })),
    };
    viewer.load_vsj(new File([JSON.stringify(legacy)], "group.vsj"));
    await viewer.when_idle();
    await sleep(100);
    const ls = viewer.models
      .filter(Boolean)
      .map((m) => viewer.get_model_animation_state(m.id));
    assert(ls.length === 2, "legacy group count");
    close(ls[0].elapsed_ms, ls[1].elapsed_ms);
  });
  await test("Invalid imported animation rolls back and retains existing models", async () => {
    const count = viewer.models_count,
      manifest = {
        models: [{ filename: "cube.stl", animation: { exact: { scale: 0 } } }],
      };
    let rejected = false;
    try {
      await viewer.import_scene(
        new File([JSON.stringify(manifest)], "bad.vsj"),
        { files: [new File([binary(cubePositions())], "cube.stl")] },
      );
    } catch {
      rejected = true;
    }
    assert(
      rejected && viewer.models_count === count,
      "invalid scene was applied",
    );
  });
  await test("Print reports become stale after motion; paused checks succeed without closing anything", async () => {
    await setup();
    await add();
    viewer.animate_model(0, spin);
    viewer.pause_model_animation(0);
    const report = await viewer.check_printability({
      model_ids: [0],
      level: "detailed",
      units_confirmed: true,
    });
    assert(viewer.is_printability_current(report), "new report stale");
    viewer.resume_model_animation(0);
    await sleep(100);
    assert(
      !viewer.is_printability_current(report),
      "moving report still current",
    );
    viewer.pause_model_animation(0);
    const next = await viewer.check_printability({
      model_ids: [0],
      level: "detailed",
      units_confirmed: true,
    });
    assert(viewer.is_printability_current(next), "paused recheck failed");
  });
  await test("Mesh and PNG export capture a pose while playback continues", async () => {
    const m = viewer._models.get(0);
    viewer.resume_model_animation(0);
    const output = await viewer.export_models({ format: "stl" });
    assert(output.blob.size > 84, "mesh export");
    const png = await viewer.get_image_blob();
    assert(png.size > 100, "PNG export");
    $("png").src = URL.createObjectURL(png);
    const before = m.rotationz;
    await sleep(100);
    assert(m.rotationz > before, "export stopped playback");
  });
  await test("Graphics context loss freezes playback and restoration resumes without a time jump", async () => {
    const m = viewer._models.get(0),
      ext = viewer.renderer.gl.getExtension("WEBGL_lose_context");
    assert(ext, "context extension unavailable");
    const event = (name) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error("context timeout")), 5000);
        viewer.canvas.addEventListener(
          name,
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
      });
    let pending = event("webglcontextlost");
    ext.loseContext();
    await pending;
    const angle = m.rotationz;
    await sleep(160);
    close(m.rotationz, angle);
    pending = event("webglcontextrestored");
    ext.restoreContext();
    await pending;
    await frame();
    assert(m.rotationz - angle < 0.12, "context time jump");
    await sleep(80);
    assert(m.rotationz > angle, "did not resume");
  });
  await test("Remove, clean and dispose release playback and GPU buffers", async () => {
    viewer.remove_model(0);
    await frame();
    assert(
      !viewer._models.size && viewer.renderer.liveBuffers === 0,
      "remove leak",
    );
    await add();
    viewer.animate_model(0, spin);
    viewer.clean();
    await frame();
    assert(
      !viewer._models.size && viewer.renderer.liveBuffers === 0,
      "clean leak",
    );
    await add();
    viewer.animate_model(0, spin);
    viewer.dispose();
    assert(
      viewer._frame === 0 && viewer.renderer.liveBuffers === 0,
      "dispose leak",
    );
    assert(!errors.length, errors.join(";"));
  });
  $("results").textContent +=
    `RESULT: ${passed} passed, ${failed} failed.\nBrowser: ${navigator.userAgent}`;
  $("run").disabled = false;
};
$("large").onclick = async () => {
  $("large").disabled = true;
  $("performance").textContent = "Building 1,000,000-triangle fixture…";
  try {
    await setup();
    await add(0, { data: { positions: torusPositions(1000, 500) } });
    const m = viewer._models.get(0),
      g = m.geometry,
      resource = viewer.renderer.resource(m, "flat"),
      buffers = viewer.renderer.liveBuffers,
      bytes = Object.values(g).reduce(
        (n, v) => n + (ArrayBuffer.isView(v) ? v.byteLength : 0),
        0,
      );
    viewer.animate_model(0, spin);
    await sleep(150);
    const times = [];
    await new Promise((resolve) => {
      const take = (t) => {
        times.push(t);
        if (times.length < 121) requestAnimationFrame(take);
        else resolve();
      };
      requestAnimationFrame(take);
    });
    viewer.pause_model_animation(0);
    const gaps = times
      .slice(1)
      .map((t, i) => t - times[i])
      .sort((a, b) => a - b);
    assert(
      viewer.renderer.resource(m, "flat") === resource &&
        viewer.renderer.liveBuffers === buffers &&
        m.geometry === g,
      "GPU resources changed",
    );
    $("performance").textContent = JSON.stringify(
      {
        triangles: g.triangles,
        frames: 120,
        frame_ms_median: gaps[60],
        frame_ms_p95: gaps[114],
        frame_ms_max: gaps.at(-1),
        resident_geometry_array_bytes: bytes,
        gpu_buffer_count: buffers,
        geometry_and_gpu_resources_reused: true,
        limits:
          "One local desktop browser; frame intervals, not GPU timings or total process memory.",
      },
      null,
      2,
    );
  } catch (e) {
    $("performance").textContent = "FAIL " + e.message;
  } finally {
    $("large").disabled = false;
  }
};
$("background").onclick = async () => {
  await setup();
  const m = await add();
  viewer.animate_model(0, spin);
  let saved, hiddenAt;
  const listener = () => {
    if (document.hidden) {
      saved = {
        angle: m.rotationz,
        elapsed: viewer.get_model_animation_state(0).elapsed_ms,
      };
      hiddenAt = performance.now();
    } else if (saved) {
      const duration = performance.now() - hiddenAt,
        now = viewer.get_model_animation_state(0);
      const ok =
        m.rotationz === saved.angle && now.elapsed_ms === saved.elapsed;
      $("visibility").textContent = JSON.stringify(
        { actual_visibility_event: true, hidden_ms: duration, pose_frozen: ok },
        null,
        2,
      );
      document.removeEventListener("visibilitychange", listener);
      viewer.pause_model_animation(0);
    }
  };
  document.addEventListener("visibilitychange", listener);
  $("visibility").textContent = "Armed. Switch to another tab, then return.";
};
