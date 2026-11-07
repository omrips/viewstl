import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import {
  analyzeFile,
  analyzeBuffer,
  createAnalyzer,
} from "../../build/node/index.js";
import { binary, cubePositions, torusPositions } from "./fixtures.js";
import { exportGeometry } from "../../src/export.js";
import { checkMesh } from "../../src/print-check.js";
import { identity } from "../../src/math.js";
import { unzipChecked } from "../../src/archive.js";
import { zipSync } from "fflate";
const cube = () => new Uint8Array(binary(cubePositions()));
const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-5, `${actual} != ${expected}`);
const check = (report, code) =>
  report.checks.find((item) => item.code === code);

test("Node file analysis uses real workers, preserves data and agrees with browser core", async () => {
  const folder = await mkdtemp(join(tmpdir(), "viewstl-node-"));
  try {
    const path = join(folder, "cube.STL");
    await writeFile(path, cube());
    const phases = [];
    const result = await analyzeFile(pathToFileURL(path), {
      units: "mm",
      on_progress: (p) => phases.push(p.phase),
    });
    const core = checkMesh(
      {
        id: 0,
        name: "cube.STL",
        positions: cubePositions(),
        matrix: identity(),
        source_units: "mm",
      },
      { level: "detailed" },
    );
    assert.equal(result.format, "stl");
    assert.equal(result.filename, "cube.STL");
    assert.equal(result.file_bytes, 684);
    assert.equal(result.triangles, 12);
    assert.equal(result.units, "mm");
    assert.equal(result.units_source, "option");
    assert.deepEqual(result.dimensions_mm, [2, 2, 2]);
    close(result.volume_mm3, 8);
    close(result.surface_area_mm2, 24);
    assert.equal(result.summary, "no_issues_found");
    assert.deepEqual(
      result.checks.filter((item) => item.code !== "units"),
      core.checks.filter((item) => item.code !== "units"),
    );
    assert.equal(check(result, "units").status, "pass");
    assert.ok(
      phases.includes("reading") &&
        phases.includes("parsing") &&
        phases.includes("Topology"),
    );
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
    assert.deepEqual(new Uint8Array(await readFile(path)), cube());
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test("Buffer offsets and unitless/physical scales are handled explicitly", async () => {
  const container = Buffer.alloc(1000, 127);
  container.set(cube(), 100);
  const source = container.subarray(100, 784),
    before = Buffer.from(container);
  const raw = await analyzeBuffer(source, { filename: "cube.stl" });
  assert.equal(raw.units, null);
  assert.equal(raw.units_source, null);
  assert.equal(raw.dimensions_mm, null);
  assert.equal(raw.surface_area_mm2, null);
  assert.equal(raw.volume_mm3, null);
  assert.equal(raw.volume_valid, true);
  close(raw.volume, 8);
  assert.equal(check(raw, "units").status, "inconclusive");
  assert.equal(raw.tolerance_mm, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(raw)), raw);
  const inches = await analyzeBuffer(source, { format: "stl", units: "in" });
  close(inches.dimensions_mm[0], 50.8);
  close(inches.volume_mm3, 8 * 25.4 ** 3);
  close(inches.surface_area_mm2, 24 * 25.4 ** 2);
  assert.deepEqual(container, before);
  const sourceArray = cube().buffer;
  await analyzeBuffer(sourceArray, { filename: "cube.stl", units: "mm" });
  assert.equal(sourceArray.byteLength, 684);
});

test("Open and malformed meshes do not acquire a validated volume; failures recover", async () => {
  const open = await analyzeBuffer(binary(cubePositions().slice(9)), {
    filename: "open.stl",
    units: "mm",
  });
  assert.equal(check(open, "boundary_edges").count, 3);
  assert.equal(open.volume, null);
  assert.equal(open.volume_mm3, null);
  assert.equal(open.volume_valid, false);
  await assert.rejects(
    analyzeBuffer(new Uint8Array([1, 2, 3]), { filename: "bad.stl" }),
  );
  const valid = await analyzeBuffer(cube(), {
    format: "stl",
    units: "mm",
    level: "basic",
  });
  assert.equal(valid.volume_valid, false);
  assert.equal(valid.volume_mm3, null);
  assert.equal(check(valid, "intersections").status, "not_run");
});

test("OBJ and 3MF reuse the existing parsers and report normalized units", async () => {
  const model = {
    id: 0,
    name: "cube",
    positions: cubePositions(),
    matrix: identity(),
    opacity: 1,
  };
  for (const format of ["obj", "3mf"]) {
    const output = await exportGeometry([model], { format, colors: false });
    const report = await analyzeBuffer(await output.blob.arrayBuffer(), {
      filename: output.filename,
      ...(format === "obj" ? { units: "mm" } : {}),
    });
    assert.equal(report.format, format);
    assert.equal(report.triangles, 12);
    assert.equal(report.units_source, format === "3mf" ? "file" : "option");
    close(report.volume_mm3, 8);
    if (format === "3mf") {
      const files = Object.fromEntries(
        unzipChecked(await output.blob.arrayBuffer()),
      );
      for (const name of Object.keys(files).filter((name) =>
        name.endsWith(".model"),
      ))
        files[name] = new TextEncoder().encode(
          new TextDecoder()
            .decode(files[name])
            .replace('unit="millimeter"', 'unit="inch"'),
        );
      const inches = await analyzeBuffer(zipSync(files), { format: "3mf" });
      close(inches.dimensions_mm[0], 50.8);
    }
  }
  await assert.rejects(
    analyzeBuffer(cube(), { format: "3mf", units: "in" }),
    /cannot override/,
  );
});

test("Packaged STEP and IGES use local WASM and file units without browser globals", async () => {
  const fixture = new URL(
    "../../node_modules/occt-import-js/test/testfiles/cube-10x10mm/",
    import.meta.url,
  );
  for (const [file, format] of [
    ["Cube 10x10.stp", "step"],
    ["Cube 10x10.igs", "iges"],
  ]) {
    const report = await analyzeFile(new URL(file, fixture));
    assert.equal(report.format, format);
    assert.equal(report.units_source, "file");
    assert.equal(report.triangles, 12);
    assert.deepEqual(report.dimensions_mm, [10, 10, 10]);
    close(report.volume_mm3, 1000);
  }
  const inches = await analyzeFile(
    new URL("../cube-units/cube-in.step", fixture),
  );
  const mm = await analyzeFile(new URL("../cube-units/cube-mm.step", fixture));
  assert.deepEqual(inches.dimensions_mm, mm.dimensions_mm);
  await assert.rejects(
    analyzeBuffer(new TextEncoder().encode("broken CAD"), { format: "step" }),
  );
});

test("Input, triangle, archive and analysis memory budgets reject oversized work", async () => {
  await assert.rejects(
    analyzeBuffer(new Uint8Array(64 * 1024 ** 2 + 1), {
      format: "stl",
      limits: { max_file_bytes: undefined },
    }),
    { code: "ERR_FILE_TOO_LARGE" },
  );
  await assert.rejects(
    analyzeBuffer(cube(), { format: "stl", limits: { max_file_bytes: 100 } }),
    { code: "ERR_FILE_TOO_LARGE" },
  );
  await assert.rejects(
    analyzeBuffer(cube(), { format: "stl", limits: { max_triangles: 10 } }),
    /Triangle limit/,
  );
  await assert.rejects(
    analyzeBuffer(binary(torusPositions(96, 96)), {
      format: "stl",
      limits: { max_memory_bytes: 100 * 1024 ** 2 },
    }),
    /memory|budget/i,
  );
  const output = await exportGeometry(
    [{ id: 0, positions: cubePositions(), matrix: identity(), opacity: 1 }],
    { format: "3mf" },
  );
  await assert.rejects(
    analyzeBuffer(await output.blob.arrayBuffer(), {
      format: "3mf",
      limits: { max_uncompressed_bytes: 10 },
    }),
    /expansion limit/i,
  );
  const folder = await mkdtemp(join(tmpdir(), "viewstl-limits-"));
  try {
    const file = join(folder, "cube.stl");
    await writeFile(file, cube());
    await assert.rejects(
      analyzeFile(file, { limits: { max_file_bytes: 100 } }),
      { code: "ERR_FILE_TOO_LARGE" },
    );
    await assert.rejects(
      analyzeFile(folder, { format: "stl" }),
      /regular file/,
    );
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test("Cancellation, deadlines, queue admission and disposal settle all jobs", async () => {
  const analyzer = createAnalyzer({
    concurrency: 1,
    max_queue: 1,
    max_queued_bytes: 1000,
  });
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(
    analyzer.analyzeBuffer(cube(), { format: "stl", signal: abort.signal }),
    { name: "AbortError" },
  );
  const activeAbort = new AbortController(),
    queuedAbort = new AbortController();
  const first = analyzer.analyzeBuffer(binary(torusPositions(96, 64)), {
    format: "stl",
    units: "mm",
    signal: activeAbort.signal,
  });
  const firstRejected = assert.rejects(first, { name: "AbortError" });
  const second = analyzer.analyzeBuffer(cube(), {
    format: "stl",
    signal: queuedAbort.signal,
  });
  const secondRejected = assert.rejects(second, { name: "AbortError" });
  await assert.rejects(analyzer.analyzeBuffer(cube(), { format: "stl" }), {
    code: "ERR_ANALYZER_BUSY",
  });
  queuedAbort.abort();
  activeAbort.abort();
  await Promise.all([firstRejected, secondRejected]);
  await assert.rejects(
    analyzer.analyzeBuffer(cube(), { format: "stl", timeout_ms: 1 }),
    { code: "ERR_ANALYSIS_TIMEOUT" },
  );
  const valid = await analyzer.analyzeBuffer(cube(), {
    format: "stl",
    units: "mm",
  });
  assert.equal(valid.summary, "no_issues_found");
  const duringChecks = new AbortController();
  let reachedChecks = false;
  await assert.rejects(
    analyzer.analyzeBuffer(binary(torusPositions(96, 64)), {
      format: "stl",
      units: "mm",
      signal: duringChecks.signal,
      on_progress(p) {
        if (p.phase === "Topology") {
          reachedChecks = true;
          duringChecks.abort();
        }
      },
    }),
    { name: "AbortError" },
  );
  assert.equal(reachedChecks, true);
  const running = analyzer.analyzeBuffer(cube(), { format: "stl" });
  const rejected = assert.rejects(running, { code: "ERR_ANALYZER_CLOSED" });
  await analyzer.dispose();
  await rejected;
  await assert.rejects(analyzer.analyzeBuffer(cube(), { format: "stl" }), {
    code: "ERR_ANALYZER_CLOSED",
  });
});

test("FDM options and partial-check deadlines retain explicit report statuses", async () => {
  const physical = await analyzeBuffer(cube(), {
    format: "stl",
    units: "mm",
    profile: {
      technology: "fdm",
      build_volume_mm: [1, 1, 1],
      overhang_degrees: 45,
    },
  });
  assert.equal(check(physical, "build_volume").status, "issue");
  const unknown = await analyzeBuffer(cube(), {
    format: "stl",
    profile: { technology: "fdm", overhang_degrees: 45 },
  });
  assert.equal(check(unknown, "overhangs").area_mm2, undefined);
  const partial = await analyzeBuffer(binary(torusPositions(96, 64)), {
    format: "stl",
    units: "mm",
    max_time_ms: 0.001,
  });
  assert.equal(partial.limit_reason, "time");
  assert.equal(partial.summary, "incomplete");
  assert.equal(partial.volume_valid, false);
  assert.equal(partial.volume_mm3, null);
});

test("Worker work leaves the event loop responsive and callback errors are contained", async () => {
  const analyzer = createAnalyzer({
    concurrency: 1,
    max_queue: 2,
    max_queued_bytes: 100,
  });
  let ticks = 0;
  const timer = setInterval(() => ticks++, 1);
  try {
    const job = analyzer.analyzeBuffer(binary(torusPositions(72, 48)), {
      format: "stl",
      units: "mm",
    });
    await assert.rejects(analyzer.analyzeBuffer(cube(), { format: "stl" }), {
      code: "ERR_ANALYZER_BUSY",
    });
    await job;
    assert.ok(ticks > 0, "analysis blocked the main thread");
    await assert.rejects(
      analyzer.analyzeBuffer(cube(), {
        format: "stl",
        on_progress() {
          throw new Error("callback failure");
        },
      }),
      /callback failure/,
    );
    await assert.rejects(
      analyzer.analyzeBuffer(cube(), {
        format: "stl",
        async on_progress() {
          throw new Error("async callback failure");
        },
      }),
      /async callback failure/,
    );
    assert.equal(
      (await analyzer.analyzeBuffer(cube(), { format: "stl" })).triangles,
      12,
    );
  } finally {
    clearInterval(timer);
    await analyzer.dispose();
  }
});

test("Node API rejects network URLs, invalid options and missing format hints", async () => {
  for (const path of [
    "https://example.com/model.stl",
    "file:///tmp/model.stl",
    "\\\\host\\share\\model.stl",
    new URL("https://example.com/model.stl"),
  ])
    await assert.rejects(analyzeFile(path), /local file/);
  await assert.rejects(analyzeBuffer(cube()), /filename or format/);
  await assert.rejects(analyzeBuffer(cube(), { format: "f3d" }), {
    code: "ERR_UNSUPPORTED_FORMAT",
  });
  await assert.rejects(
    analyzeBuffer(cube(), { format: "stl", units: "yards" }),
    /Units/,
  );
  await assert.rejects(
    analyzeBuffer(cube(), { format: "stl", level: "unknown" }),
    /basic or detailed/,
  );
  await assert.rejects(
    analyzeBuffer(cube(), { format: "stl", signal: {} }),
    /AbortSignal/,
  );
  await assert.rejects(
    analyzeBuffer(cube(), { format: "stl", limits: { max_memory_byte: 10 } }),
    /Unknown analysis limit/,
  );
  await assert.rejects(
    analyzeBuffer(cube(), { format: "stl", on_progress: 1 }),
    /function/,
  );
  await assert.rejects(
    analyzeBuffer(new Uint8Array(new SharedArrayBuffer(10)), { format: "stl" }),
    /Expected/,
  );
  assert.throws(() => createAnalyzer({ concurrency: 0 }), /concurrency/);
});

test("CommonJS entry point resolves the same packaged worker", async () => {
  const api = createRequire(import.meta.url)("../../build/node/index.cjs");
  const report = await api.analyzeBuffer(cube(), {
    filename: "cube.stl",
    units: "mm",
  });
  close(report.volume_mm3, 8);
  assert.equal(report.summary, "no_issues_found");
});
