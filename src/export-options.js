// Small main-thread contract; writers and compression are loaded by the worker only.
import { MEMORY_OVERHEAD } from "./memory.js";

export function exportFilename(filename, extension) {
  const name =
    String(filename || "scene")
      .split(/[\\/]/)
      .pop()
      .split(/[?#]/)[0]
      .replace(/[<>:"|*\x00-\x1f\x7f]/g, "_")
      .replace(/\.(?:stl|obj|3mf|step|stp|iges|igs|zip|vsb|vsj)$/i, "")
      .replace(/[. ]+$/g, "")
      .slice(0, 160) || "scene";
  return `${name}.${extension}`;
}

export function exportOptions(options = {}) {
  const aliases = { stp: "step", igs: "iges" };
  const requested = String(options.format || "").toLowerCase();
  const format = aliases[requested] || requested;
  if (!["stl", "obj", "3mf", "step", "iges"].includes(format))
    throw new Error("Export format must be stl, obj, 3mf, step or iges");
  const units = options.units ?? "mm";
  if (!["mm", "inch"].includes(units))
    throw new Error("Export units must be mm or inch");
  for (const key of ["apply_transforms", "colors"])
    if (options[key] !== undefined && typeof options[key] !== "boolean")
      throw new Error(`${key} must be a boolean`);
  if (
    options.on_progress !== undefined &&
    typeof options.on_progress !== "function"
  )
    throw new Error("on_progress must be a function");
  const colors = options.colors !== false && ["obj", "3mf"].includes(format);
  const extension = format === "obj" && colors ? "zip" : format;
  return {
    format,
    units,
    colors,
    apply_transforms: options.apply_transforms !== false,
    filename: exportFilename(options.filename, extension),
  };
}

export function exportMemory(models, options) {
  const triangles = models.reduce((sum, m) => sum + m.geometry.triangles, 0);
  // Includes the transferred snapshot, maps/index arrays, encoded output and Blob/ZIP copies.
  // Conservative policy estimates, not a measurement of browser free memory.
  const perTriangle = {
    stl: 192,
    obj: 2400,
    "3mf": 3000,
    step: 12000,
    iges: 4000,
  };
  return (
    MEMORY_OVERHEAD +
    triangles * perTriangle[options.format] +
    models.length * 4096
  );
}
