import { parentPort, workerData as task } from "node:worker_threads";
import { open, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { parseGeometry } from "../parser.js";
import { parse3MF } from "../archive.js";
import { parseCAD } from "../cad.js";
import { checkMesh } from "../print-check.js";
import { printMemory } from "../print-options.js";
import { assertMemory, geometryMemory } from "../memory.js";
import { identity } from "../math.js";

const start = performance.now();
let cadEngine;
const progress = (details) =>
  parentPort.postMessage({
    progress: { ...details, elapsed_ms: performance.now() - start },
  });
async function loadFile() {
  if (task.buffer) return task.buffer;
  const before = await stat(task.path);
  if (!before.isFile()) throw new Error("Input must be a regular file");
  // Do not block opening a FIFO if a POSIX path changes between stat and open.
  const flags =
    constants.O_RDONLY |
    (process.platform === "win32" ? 0 : constants.O_NONBLOCK);
  const file = await open(task.path, flags);
  try {
    const info = await file.stat();
    if (!info.isFile()) throw new Error("Input must be a regular file");
    if (info.size > task.limits.max_file_bytes)
      throw Object.assign(new Error("File size limit exceeded"), {
        code: "ERR_FILE_TOO_LARGE",
      });
    assertMemory(task.limits, info.size * 2 + 64 * 1024 ** 2, "file input");
    const bytes = new Uint8Array(info.size);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await file.read(
        bytes,
        offset,
        Math.min(1024 ** 2, bytes.length - offset),
        offset,
      );
      if (!bytesRead) throw new Error("File changed while being read");
      offset += bytesRead;
    }
    if ((await file.read(new Uint8Array(1), 0, 1, offset)).bytesRead)
      throw new Error("File changed while being read");
    return bytes.buffer;
  } finally {
    await file.close();
  }
}
async function initializeCAD(options) {
  // Relative to the distributed build/node/analysis-worker.js.
  const { default: factory } = await import(
    new URL("../cad/occt-import-js.js", import.meta.url).href
  );
  const wasmBinary = await readFile(
    new URL("../cad/occt-import-js.wasm", import.meta.url),
  );
  cadEngine = await factory({ ...options, wasmBinary });
  return cadEngine;
}
try {
  progress({ phase: "reading" });
  const buffer = await loadFile();
  const fileBytes = buffer.byteLength;
  progress({ phase: "parsing", loaded: fileBytes, total: fileBytes });
  const name = `model.${task.format}`;
  const geometry = ["step", "iges"].includes(task.format)
    ? await parseCAD(
        buffer,
        name,
        task.limits,
        (phase) => progress({ phase }),
        initializeCAD,
      )
    : task.format === "3mf"
      ? parse3MF(buffer, task.limits)
      : parseGeometry(buffer, name, task.limits);
  const cadBytes = cadEngine
    ? 128 * 1024 ** 2 + cadEngine.HEAPU8.byteLength
    : 0;
  assertMemory(
    task.limits,
    fileBytes +
      cadBytes +
      geometryMemory(geometry) +
      printMemory(geometry.triangles),
    "analysis",
  );
  // The shared 3MF parser normalizes coordinates to mm but does not attach units.
  const fileUnits = task.format === "3mf" ? "mm" : geometry.units;
  const units = fileUnits ?? task.units ?? null;
  const scale = fileUnits
    ? 1
    : ({ mm: 1, cm: 10, m: 1000, in: 25.4, ft: 304.8, um: 0.001 }[units] ?? 1);
  const matrix = identity();
  matrix[0] = matrix[5] = matrix[10] = scale;
  const report = checkMesh(
    {
      id: 0,
      name: task.filename,
      positions: geometry.positions,
      matrix,
      source_units: units,
    },
    task.checks,
    task.limits,
    progress,
  );
  if (!units) {
    delete report.tolerance_mm;
    for (const check of report.checks) delete check.area_mm2;
  } else if (!fileUnits) {
    const unitCheck = report.checks.find((check) => check.code === "units");
    if (unitCheck.status === "pass")
      unitCheck.message = `Input scale supplied as ${units}; measurements normalized to mm.`;
  }
  const area = geometry.area * scale ** 2;
  if (!Number.isFinite(area))
    throw new Error("Surface area exceeds numeric limits");
  const result = {
    ...report,
    schema_version: 1,
    filename: task.filename,
    format: task.format,
    file_bytes: fileBytes,
    units: units ? "mm" : null,
    units_source: fileUnits ? "file" : task.units ? "option" : null,
    dimensions: report.dimensions_mm,
    surface_area: area,
    volume: report.volume_valid ? report.volume_mm3 : null,
    dimensions_mm: units ? report.dimensions_mm : null,
    surface_area_mm2: units ? area : null,
    volume_mm3: units && report.volume_valid ? report.volume_mm3 : null,
    elapsed_ms: performance.now() - start,
  };
  parentPort.postMessage({ result });
} catch (error) {
  parentPort.postMessage({
    error: {
      name: error.name || "Error",
      code: error.code || "ERR_ANALYSIS",
      message:
        error instanceof RangeError
          ? "Analysis could not allocate memory within the available resources"
          : error.message || String(error),
    },
  });
}
