// src/node/api.js
import { Worker } from "node:worker_threads";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// src/memory.js
var MEMORY_OVERHEAD = 64 * 1024 * 1024;

// src/geometry.js
var DEFAULT_LIMITS = Object.freeze({
  max_file_bytes: 256 * 1024 * 1024,
  max_triangles: 5e6,
  max_uncompressed_bytes: 256 * 1024 * 1024,
  max_archive_entries: 1024,
  max_memory_bytes: Number.MAX_SAFE_INTEGER
});
function limitsWith(options = {}) {
  const limits = { ...DEFAULT_LIMITS };
  for (const key of Object.keys(limits))
    if (options[key] !== void 0) {
      if (!Number.isSafeInteger(options[key]) || options[key] < 1)
        throw new Error(`Invalid ${key}`);
      limits[key] = options[key];
    }
  return limits;
}

// src/print-options.js
function printOptions(input = {}) {
  const level = input.level ?? "basic";
  if (!["basic", "detailed"].includes(level))
    throw new Error("Choose basic or detailed print checks");
  const number = (v, name, max = 1e9) => {
    if (!Number.isFinite(v) || v <= 0 || v > max)
      throw new Error(`Invalid ${name}`);
    return v;
  };
  let profile = null;
  if (input.profile != null) {
    if (input.profile.technology !== "fdm")
      throw new Error("Only FDM profiles are supported");
    profile = { technology: "fdm" };
    for (const key of ["min_wall_mm", "line_width_mm"])
      if (input.profile[key] != null)
        profile[key] = number(input.profile[key], key);
    if (input.profile.overhang_degrees != null)
      profile.overhang_degrees = number(
        input.profile.overhang_degrees,
        "overhang angle",
        89.9
      );
    if (input.profile.build_volume_mm != null) {
      if (!Array.isArray(input.profile.build_volume_mm) || input.profile.build_volume_mm.length !== 3)
        throw new Error("Build volume requires X, Y and Z");
      profile.build_volume_mm = input.profile.build_volume_mm.map(
        (v) => number(v, "build volume")
      );
    }
  }
  const time = number(input.max_time_ms ?? 3e4, "check time limit", 12e4);
  return {
    level,
    profile,
    apply_transforms: input.apply_transforms !== false,
    units_confirmed: input.units_confirmed === true,
    max_time_ms: time
  };
}

// src/node/api.js
var MB = 1024 ** 2;
var defaults = {
  max_file_bytes: 64 * MB,
  max_triangles: 1e6,
  max_uncompressed_bytes: 128 * MB,
  max_archive_entries: 1024,
  max_memory_bytes: 1024 * MB
};
var formats = /* @__PURE__ */ new Map([
  ["stl", "stl"],
  ["obj", "obj"],
  ["3mf", "3mf"],
  ["step", "step"],
  ["stp", "step"],
  ["iges", "iges"],
  ["igs", "iges"]
]);
var units = /* @__PURE__ */ new Set(["mm", "cm", "m", "in", "ft", "um"]);
function failure(message, code, name = "Error") {
  return Object.assign(new Error(message), { code, name });
}
function integer(value, name, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new TypeError(`Invalid ${name}`);
  return value;
}
function localPath(input) {
  if (input instanceof URL) {
    if (input.protocol !== "file:" || input.hostname && input.hostname !== "localhost")
      throw new TypeError("Only local file paths and file: URLs are supported");
    input = fileURLToPath(input);
  }
  if (typeof input !== "string" || !input || input.includes("\0") || /^[\\/]{2}/.test(input) || /^[a-z][a-z\d+.-]*:/i.test(input) && !/^[a-z]:[\\/]/i.test(input))
    throw new TypeError("Only local file paths and file: URLs are supported");
  return resolve(input);
}
function settings(input, filename) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new TypeError("Analysis options must be an object");
  const format = formats.get(
    String(input.format ?? filename.split(".").pop()).toLowerCase()
  );
  if (!format)
    throw failure(
      "Choose STL, OBJ, 3MF, STEP/STP or IGES/IGS",
      "ERR_UNSUPPORTED_FORMAT"
    );
  if (input.units !== void 0 && !units.has(input.units))
    throw new TypeError("Units must be mm, cm, m, in, ft or um");
  if (input.units !== void 0 && input.units !== "mm" && !["stl", "obj"].includes(format))
    throw new TypeError(
      "3MF and CAD file units are honored and converted to mm; units cannot override them"
    );
  if (input.limits !== void 0 && (!input.limits || typeof input.limits !== "object" || Array.isArray(input.limits)))
    throw new TypeError("limits must be an object");
  for (const key of Object.keys(input.limits ?? {}))
    if (!Object.hasOwn(defaults, key))
      throw new TypeError(`Unknown analysis limit: ${key}`);
  const overrides = Object.fromEntries(
    Object.entries(input.limits ?? {}).filter(
      ([, value]) => value !== void 0
    )
  );
  const limits = limitsWith({ ...defaults, ...overrides });
  const timeout_ms = integer(
    input.timeout_ms ?? 12e4,
    "timeout_ms",
    1,
    2147483647
  );
  const checks = printOptions({
    level: input.level ?? "detailed",
    profile: input.profile,
    max_time_ms: input.max_time_ms ?? 3e4
  });
  if (input.on_progress !== void 0 && typeof input.on_progress !== "function")
    throw new TypeError("on_progress must be a function");
  if (input.signal !== void 0 && !(input.signal instanceof AbortSignal))
    throw new TypeError("signal must be an AbortSignal");
  return { filename, format, units: input.units, limits, timeout_ms, checks };
}
function createAPI(workerURL) {
  function createAnalyzer2(options = {}) {
    const concurrency = integer(options.concurrency ?? 2, "concurrency", 1, 8);
    const maxQueue = integer(options.max_queue ?? 16, "max_queue", 0, 1024);
    const maxQueuedBytes = integer(
      options.max_queued_bytes ?? 128 * MB,
      "max_queued_bytes",
      1,
      Number.MAX_SAFE_INTEGER
    );
    const queue = [], active = /* @__PURE__ */ new Set();
    let closed = false, queuedBytes = 0;
    const abortError = () => failure("Analysis cancelled", "ABORT_ERR", "AbortError");
    function finish(job, error, result) {
      if (job.done) return job.finished;
      job.done = true;
      clearTimeout(job.timer);
      job.signal?.removeEventListener("abort", job.abort);
      const index = queue.indexOf(job);
      if (index >= 0) {
        queue.splice(index, 1);
        queuedBytes -= job.bytes;
      }
      job.task = null;
      job.finished = (async () => {
        if (job.worker) await job.worker.terminate().catch(() => {
        });
        active.delete(job);
        error ? job.reject(error) : job.resolve(result);
        pump();
      })();
      return job.finished;
    }
    function pump() {
      while (!closed && active.size < concurrency && queue.length) {
        const job = queue.shift();
        queuedBytes -= job.bytes;
        active.add(job);
        try {
          const task = job.task;
          job.worker = new Worker(workerURL, {
            workerData: task,
            transferList: task.buffer ? [task.buffer] : [],
            // CLI eval/test flags are not valid entry flags for a file worker.
            execArgv: [],
            resourceLimits: {
              maxOldGenerationSizeMb: Math.max(
                16,
                Math.min(
                  4096,
                  Math.floor(task.limits.max_memory_bytes / MB / 2)
                )
              )
            }
          });
          job.task = null;
          job.worker.on("message", (message) => {
            if (job.done) return;
            if (message.progress) {
              try {
                Promise.resolve(job.progress?.(message.progress)).catch(
                  (error) => void finish(job, error)
                );
              } catch (error) {
                void finish(job, error);
              }
            } else if (message.error) {
              void finish(
                job,
                failure(
                  message.error.message,
                  message.error.code,
                  message.error.name
                )
              );
            } else if (message.result) void finish(job, null, message.result);
            else
              void finish(
                job,
                failure(
                  "Invalid analysis worker response",
                  "ERR_ANALYSIS_WORKER"
                )
              );
          });
          job.worker.on("error", (error) => void finish(job, error));
          job.worker.on("exit", (code) => {
            if (!job.done)
              void finish(
                job,
                failure(
                  `Analysis worker stopped (exit ${code})`,
                  "ERR_ANALYSIS_WORKER"
                )
              );
          });
        } catch (error) {
          void finish(job, error);
        }
      }
    }
    function submit(task, input, source) {
      if (closed)
        return Promise.reject(
          failure("Analyzer is closed", "ERR_ANALYZER_CLOSED")
        );
      if (input.signal?.aborted) return Promise.reject(abortError());
      if (active.size >= concurrency && queue.length >= maxQueue)
        return Promise.reject(
          failure("Analysis queue is full", "ERR_ANALYZER_BUSY")
        );
      const bytes = source?.byteLength ?? 0;
      if (bytes > task.limits.max_file_bytes)
        return Promise.reject(
          failure("File size limit exceeded", "ERR_FILE_TOO_LARGE")
        );
      if (bytes * 2 + 64 * MB > task.limits.max_memory_bytes)
        return Promise.reject(
          failure(
            "Input exceeds the analysis memory budget",
            "ERR_ANALYSIS_LIMIT"
          )
        );
      if (active.size >= concurrency && queuedBytes + bytes > maxQueuedBytes)
        return Promise.reject(
          failure("Queued input memory limit exceeded", "ERR_ANALYZER_BUSY")
        );
      if (source) task.buffer = new Uint8Array(source).buffer;
      return new Promise((resolveJob, reject) => {
        const job = {
          task,
          bytes,
          signal: input.signal,
          progress: input.on_progress,
          resolve: resolveJob,
          reject
        };
        job.abort = () => void finish(job, abortError());
        job.signal?.addEventListener("abort", job.abort, { once: true });
        job.timer = setTimeout(
          () => void finish(
            job,
            failure("Analysis timed out", "ERR_ANALYSIS_TIMEOUT")
          ),
          task.timeout_ms
        );
        queue.push(job);
        queuedBytes += bytes;
        pump();
      });
    }
    return {
      async analyzeFile(path, options2 = {}) {
        path = localPath(path);
        return submit({ ...settings(options2, basename(path)), path }, options2);
      },
      async analyzeBuffer(data, options2 = {}) {
        let bytes;
        if (data instanceof ArrayBuffer) bytes = new Uint8Array(data);
        else if (data instanceof Uint8Array && data.buffer instanceof ArrayBuffer)
          bytes = data;
        else
          throw new TypeError(
            "Expected an ArrayBuffer, Uint8Array or Node Buffer"
          );
        const filename = options2.filename ?? (options2.format ? `model.${options2.format}` : "");
        if (typeof filename !== "string" || !filename || filename.includes("\0"))
          throw new TypeError("Provide a filename or format for buffer input");
        return submit(
          settings(options2, filename.split(/[\\/]/).pop()),
          options2,
          bytes
        );
      },
      async dispose() {
        closed = true;
        await Promise.all(
          [...queue, ...active].map(
            (job) => finish(job, failure("Analyzer is closed", "ERR_ANALYZER_CLOSED"))
          )
        );
      }
    };
  }
  const shared = createAnalyzer2();
  return {
    analyzeFile: shared.analyzeFile,
    analyzeBuffer: shared.analyzeBuffer,
    createAnalyzer: createAnalyzer2
  };
}

// src/node/index.js
var { analyzeFile, analyzeBuffer, createAnalyzer } = createAPI(
  new URL("./analysis-worker.js", import.meta.url)
);
export {
  analyzeBuffer,
  analyzeFile,
  createAnalyzer
};
