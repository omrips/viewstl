import StlViewer from "../../build/viewstl.js";
import { cubePositions, torusPositions } from "./fixtures.js";

const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
const log = document.getElementById("results");
let viewer;
async function fresh(options = {}) {
  viewer?.dispose();
  viewer = new StlViewer(document.getElementById("viewer"), {
    center_models: false,
    ...options,
  });
  await viewer.when_ready;
  return viewer;
}
document.getElementById("run").onclick = async () => {
  log.textContent = "";
  const result = { passed: 0, failed: 0, checks: [], measurements: {} };
  const check = async (name, fn) => {
    try {
      await fn();
      result.passed++;
      result.checks.push({ name, passed: true });
      log.textContent += `PASS ${name}\n`;
    } catch (error) {
      result.failed++;
      result.checks.push({ name, passed: false, error: error.message });
      log.textContent += `FAIL ${name}: ${error.message}\n`;
    }
  };
  await check(
    "real export workers preserve the live scene and reimport STL/OBJ/3MF/STEP/IGES",
    async () => {
      await fresh();
      viewer.add_model({
        id: 0,
        data: { positions: cubePositions() },
        filename: "cube.stl",
        color: "#CC5500",
      });
      viewer.add_model({
        id: 1,
        data: { positions: cubePositions() },
        filename: "second.stl",
        x: 8,
      });
      await viewer.when_idle();
      viewer.set_scale(0, 2, 3, 4);
      viewer.set_rotation(0, 0.25, 0.35, 0.45);
      viewer.set_position(0, 12, -4, 20);
      for (const format of ["stl", "obj", "3mf", "step", "iges"]) {
        const phases = [],
          start = performance.now();
        const output = await viewer.export_models({
          format,
          model_ids: [0, 1],
          colors: format !== "obj",
          on_progress: (p) => phases.push(p.phase),
        });
        assert(
          output.blob instanceof Blob && output.triangles === 24,
          "export result",
        );
        assert(phases.at(-1) === "complete", "completed progress");
        assert(
          viewer._models.get(0).geometry.positions.byteLength === 432,
          "live buffer not detached",
        );
        assert(
          viewer._exportBytes === 0 && viewer._pool.active.size === 0,
          "worker and memory released",
        );
        viewer.add_model({
          id: 9,
          local_file: new File([output.blob], output.filename),
        });
        await viewer.when_idle();
        assert(
          viewer.get_model_info(9)?.triangles === 24,
          format + " reimport triangles",
        );
        viewer.remove_model(9);
        result.measurements[format] = {
          bytes: output.blob.size,
          milliseconds: Math.round(performance.now() - start),
        };
      }
      assert(viewer.renderer.gl.getError() === 0, "WebGL stays healthy");
    },
  );
  await check(
    "selected export, ZIP materials and browser download",
    async () => {
      viewer.set_selection(0);
      const out = await viewer.export_models({
        format: "obj",
        model_ids: "selected",
        filename: "part.step",
      });
      assert(
        out.filename === "part.zip" &&
          out.model_ids.length === 1 &&
          out.model_ids[0] === 0,
        "selected OBJ ZIP",
      );
      await viewer.download_models({
        format: "stl",
        model_ids: [0],
        filename: "download.step",
      });
    },
  );
  await check(
    "running export cancellation terminates worker and releases memory",
    async () => {
      const controller = new AbortController();
      let seen = false;
      try {
        await viewer.export_models({
          format: "step",
          signal: controller.signal,
          on_progress: () => {
            seen = true;
            controller.abort();
          },
        });
        throw new Error("cancel unexpectedly completed");
      } catch (error) {
        assert(error.name === "AbortError", error.message);
      }
      assert(
        seen && viewer._exportBytes === 0 && viewer._pool.active.size === 0,
        "cancel cleanup",
      );
      assert(
        (await viewer.export_models({ format: "stl" })).triangles === 24,
        "export after cancel",
      );
    },
  );
  await check(
    "queued cancellation and concurrent exports account for each reservation",
    async () => {
      viewer._pool.count = 1;
      const first = viewer.export_models({ format: "step" });
      const controller = new AbortController();
      const second = viewer.export_models({
        format: "iges",
        signal: controller.signal,
      });
      await Promise.resolve();
      controller.abort();
      const [a, b] = await Promise.allSettled([first, second]);
      assert(
        a.status === "fulfilled" &&
          b.status === "rejected" &&
          b.reason.name === "AbortError",
        "queued abort",
      );
      assert(viewer._exportBytes === 0, "all reservations released");
    },
  );
  await check(
    "export callback errors reject without leaking a worker",
    async () => {
      try {
        await viewer.export_models({
          format: "obj",
          on_progress() {
            throw new Error("callback test");
          },
        });
        throw new Error("unexpected success");
      } catch (error) {
        assert(error.message === "callback test", error.message);
      }
      assert(
        viewer._exportBytes === 0 && viewer._pool.active.size === 0,
        "callback failure cleanup",
      );
    },
  );
  await check("mesh validation failures leave the scene usable", async () => {
    viewer.add_model({
      id: 2,
      data: { positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]) },
    });
    await viewer.when_idle();
    try {
      await viewer.export_models({ format: "3mf", model_ids: [2] });
      throw new Error("unexpected success");
    } catch (error) {
      assert(error.message.includes("closed meshes"), error.message);
    }
    assert(
      viewer.get_model_info(0)?.triangles === 12 && viewer._exportBytes === 0,
      "scene preserved",
    );
    viewer.remove_model(2);
  });
  await check(
    "scene memory budget blocks oversized exports and recovers",
    async () => {
      const saved = viewer.limits.max_memory_bytes;
      viewer.limits.max_memory_bytes = 1024;
      try {
        await viewer.export_models({ format: "stl" });
        throw new Error("unexpected success");
      } catch (error) {
        assert(error.message.includes("safety budget"), error.message);
      } finally {
        viewer.limits.max_memory_bytes = saved;
      }
      assert(
        (await viewer.export_models({ format: "stl" })).triangles === 24,
        "budget recovery",
      );
    },
  );
  await check("clean cancels active exports", async () => {
    const task = viewer.export_models({
      format: "step",
      on_progress() {
        viewer.clean();
      },
    });
    try {
      await task;
      throw new Error("unexpected success");
    } catch (error) {
      assert(error.name === "AbortError", error.message);
    }
    assert(
      viewer._exportBytes === 0 && viewer._pool.active.size === 0,
      "clean cleanup",
    );
  });
  await check("million-triangle STL export stays responsive", async () => {
    await fresh({ max_memory_bytes: 1024 ** 3 });
    viewer.add_model({
      id: 0,
      data: { positions: torusPositions(1000, 500) },
      filename: "million.stl",
    });
    await viewer.when_idle();
    let frames = 0,
      running = true;
    const count = () => {
      frames++;
      if (running) requestAnimationFrame(count);
    };
    requestAnimationFrame(count);
    const start = performance.now();
    const out = await viewer.export_models({ format: "stl" });
    running = false;
    result.measurements.millionSTL = {
      bytes: out.blob.size,
      milliseconds: Math.round(performance.now() - start),
      animationFrames: frames,
    };
    assert(out.blob.size === 50000084, "million triangle binary size");
    assert(frames > 1, "main thread continued rendering");
    assert(
      viewer._exportBytes === 0 && viewer.renderer.gl.getError() === 0,
      "large export cleanup",
    );
  });
  viewer?.dispose();
  window.exportResults = result;
  log.textContent += `\n${result.passed} passed; ${result.failed} failed.\n`;
};
