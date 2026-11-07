import { printOptions, printMemory, printSignature } from "./print-options.js";
import { assertMemory } from "./memory.js";
import { modelMatrix } from "./math.js";

const reports = new WeakMap();
export function reportCurrent(viewer, report) {
  const saved = reports.get(report);
  return (
    !!saved &&
    saved.viewer.deref() === viewer &&
    saved.models.every(({ model: reference, geometry, signature }) => {
      const model = reference.deref();
      return (
        model &&
        viewer._models.get(model.id) === model &&
        model.geometry === geometry.deref() &&
        printSignature(model) === signature
      );
    })
  );
}
export async function checkPrintability(options = {}) {
  await this.when_ready;
  const settings = printOptions(options);
  if (this.killsign) throw new Error("Viewer disposed");
  let ids = options.model_ids;
  if (ids === "selected")
    ids = this.renderer?.selection ? [this.renderer.selection.id] : [];
  ids ??= [...this._models.keys()];
  if (
    !Array.isArray(ids) ||
    !ids.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !Number.isSafeInteger(id))
  )
    throw new Error("Choose one or more unique model IDs");
  if (ids.length > this.limits.max_archive_entries)
    throw new Error("Print check model limit exceeded");
  const models = ids.map((id) => {
    const model = this._model(id);
    if (!model.geometry || model._sceneImportPending)
      throw new Error("Wait for models to finish opening");
    return {
      model,
      geometry: model.geometry,
      signature: printSignature(model),
    };
  });
  const key = JSON.stringify([ids, settings]);
  if (options.signal?.aborted)
    throw new DOMException("Print check cancelled", "AbortError");
  if (
    this._printCache?.key === key &&
    reportCurrent(this, this._printCache.report)
  ) {
    const report = structuredClone(this._printCache.report);
    reports.set(report, reports.get(this._printCache.report));
    return report;
  }
  if (this._printJobs?.size)
    throw new Error("A print check is already running");
  this._printJobs ??= new Map();
  const controller = new AbortController(),
    abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  this._aborters.add(controller);
  this._printJobs.set(controller, new Set(models.map((m) => m.model)));
  let job,
    held = 0,
    callbackError;
  const cancel = () => job?.cancel?.();
  controller.signal.addEventListener("abort", cancel);
  const check = () => {
    if (controller.signal.aborted || this.killsign)
      throw new DOMException("Print check cancelled", "AbortError");
    if (
      models.some(
        ({ model, geometry, signature }) =>
          this._models.get(model.id) !== model ||
          model.geometry !== geometry ||
          printSignature(model) !== signature,
      )
    )
      throw new Error("Model changed. Run the print check again.");
  };
  const progress = (value) => {
    check();
    options.on_progress?.(value);
  };
  const results = [];
  try {
    this._printCache = null;
    // Bound report samples separately from per-model working arrays.
    const reportBytes = models.length * 256 * 1024;
    assertMemory(
      this.limits,
      this._occupiedMemory() + reportBytes,
      "print report",
    );
    held = reportBytes;
    this._printBytes = (this._printBytes || 0) + held;
    for (let index = 0; index < models.length; index++) {
      check();
      const { model, geometry } = models[index],
        working = printMemory(geometry.triangles),
        occupied = this._occupiedMemory();
      assertMemory(this.limits, occupied + working, "print check");
      this._printBytes += working;
      held += working;
      const positions = new Float32Array(geometry.positions.length);
      for (let start = 0; start < positions.length; start += 262144) {
        check();
        positions.set(
          geometry.positions.subarray(start, start + 262144),
          start,
        );
        if (start + 262144 < positions.length)
          await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const source = settings.apply_transforms
        ? model
        : {
            ...model,
            x: 0,
            y: 0,
            z: 0,
            rotationx: 0,
            rotationy: 0,
            rotationz: 0,
            center: [0, 0, 0],
            scaleVector: [model.unitScale, model.unitScale, model.unitScale],
          };
      progress({
        phase: "Starting",
        model_id: model.id,
        model_index: index,
        total_models: models.length,
      });
      job = this._pool.run(
        {
          kind: "print-check",
          model: {
            id: model.id,
            name: model.orig_filename || model.filename || `Model ${model.id}`,
            positions,
            matrix: modelMatrix(source),
            source_units: geometry.units || null,
          },
          options: settings,
          limits: {
            ...this.limits,
            max_memory_bytes: this.limits.max_memory_bytes - occupied,
          },
        },
        (p) => {
          try {
            progress({
              ...p,
              model_id: model.id,
              model_index: index,
              total_models: models.length,
            });
          } catch (error) {
            callbackError = error;
            controller.abort();
          }
        },
        [positions.buffer],
      );
      try {
        results.push(await job);
      } catch (error) {
        throw callbackError || error;
      } finally {
        job = null;
        this._printBytes -= working;
        held -= working;
      }
    }
    check();
    const report = {
      version: 1,
      model_ids: ids.slice(),
      settings,
      models: results,
      summary: results.some((r) => r.summary === "issues_found")
        ? "issues_found"
        : results.some((r) => r.summary === "incomplete")
          ? "incomplete"
          : "no_issues_found",
      scope:
        "Each model checked separately; no cross-model union or collision analysis.",
      estimated: !!settings.profile,
    };
    const saved = {
      viewer: new WeakRef(this),
      models: models.map(({ model, geometry, signature }) => ({
        model: new WeakRef(model),
        geometry: new WeakRef(geometry),
        signature,
      })),
    };
    reports.set(report, saved);
    const cached = structuredClone(report);
    reports.set(cached, saved);
    // A single bounded result cache, with no topology/BVH retained.
    if (
      JSON.stringify(cached).length < 2 * 1024 * 1024 &&
      this._occupiedMemory() + 4 * 1024 ** 2 <= this.limits.max_memory_bytes
    )
      this._printCache = { key, report: cached };
    progress({ phase: "Complete", total_models: models.length });
    return report;
  } finally {
    job?.cancel?.();
    this._printBytes = (this._printBytes || 0) - held;
    options.signal?.removeEventListener("abort", abort);
    this._aborters.delete(controller);
    this._printJobs.delete(controller);
  }
}
export function showPrintability(
  report,
  { issue, model_id = report.model_ids[0] } = {},
) {
  if (!reportCurrent(this, report))
    throw new Error("Print report is stale. Run the check again.");
  const result = report.models.find((m) => m.model_id === model_id),
    item = result?.checks.find((c) => c.code === issue);
  if (!item) throw new Error("Unknown print check issue");
  const model = this._model(model_id),
    p = model.geometry.positions,
    lines = [];
  if (item.edge_vertices?.length)
    lines.push(...item.edge_vertices.slice(0, 1536));
  else
    for (const i of item.triangle_ids.slice(0, 128)) {
      if (!Number.isInteger(i) || i < 0 || i >= model.geometry.triangles)
        continue;
      for (let k = 0; k < 3; k++)
        lines.push(
          ...p.subarray(i * 9 + k * 3, i * 9 + k * 3 + 3),
          ...p.subarray(
            i * 9 + ((k + 1) % 3) * 3,
            i * 9 + ((k + 1) % 3) * 3 + 3,
          ),
        );
    }
  if (lines.some((v) => !Number.isFinite(v)))
    throw new Error("Invalid print highlight");
  this.renderer.setDiagnostic(
    lines.length
      ? {
          model,
          positions: new Float32Array(lines),
          signature: printSignature(model),
        }
      : null,
  );
  this._invalidate();
  return lines.length / 6;
}
