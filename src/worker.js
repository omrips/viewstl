import { parseGeometry, parseBinarySTLBlob } from "./parser.js";
import { DEFAULT_LIMITS, deriveGeometry } from "./geometry.js";
import { readSource } from "./io.js";
import { assertMemory, derivedMemory } from "./memory.js";
import { readRemote } from "./remote.js";
function transfers(value, result = new Set()) {
  if (value instanceof ArrayBuffer) result.add(value);
  else if (ArrayBuffer.isView(value)) result.add(value.buffer);
  else if (value && typeof value === "object")
    for (const item of Object.values(value)) transfers(item, result);
  return [...result];
}
self.onmessage = async ({ data: { id, task } }) => {
  try {
    const limits = task.limits || DEFAULT_LIMITS;
    let result;
    if (task.kind === "derive") {
      assertMemory(
        limits,
        derivedMemory(task.positions.length / 9, task.features),
        "view mode",
      );
      result = deriveGeometry(task.positions, task.features);
    } else if (task.kind === "measure")
      result = (await import("./measure.js")).measure(task, (progress) =>
        self.postMessage({ id, progress }),
      );
    else if (task.kind === "print-check")
      result = (await import("./print-check.js")).checkMesh(
        task.model,
        task.options,
        limits,
        (progress) => self.postMessage({ id, progress }),
      );
    else if (task.kind === "export")
      result = await (
        await import("./export.js")
      ).exportGeometry(task.models, task.options, limits, (progress) =>
        self.postMessage({ id, progress }),
      );
    else if (task.kind === "export-scene")
      result = (await import("./scene-export.js")).exportSceneArchive(
        task.scene,
        task.models,
        limits,
        (progress) => self.postMessage({ id, progress }),
      );
    else if (task.kind === "zip")
      result = (await import("./archive.js")).zipScene(task.scene, limits);
    else {
      const progress = (loaded, total) =>
        self.postMessage({ id, progress: { loaded, total } });
      const remote = task.remote ? await readRemote(task, progress) : null;
      const name = remote ? `download.${remote.format}` : task.name;
      if (remote?.geometry) result = remote.geometry;
      const isCAD = /\.(step|stp|iges|igs)(?:[?#]|$)/i.test(name);
      const inputLimit = isCAD
        ? Math.min(
            limits.max_file_bytes,
            Math.max(
              0,
              Math.floor(
                ((limits.max_memory_bytes ?? Number.MAX_SAFE_INTEGER) -
                  128 * 1024 ** 2) /
                  40,
              ),
            ),
          )
        : limits.max_file_bytes;
      if (
        task.kind === "parse" &&
        task.source instanceof Blob &&
        /\.stl(?:[?#]|$)/i.test(task.name)
      )
        result = await parseBinarySTLBlob(task.source, limits, progress);
      const buffer = result
        ? null
        : (remote?.buffer ??
          (await readSource(task.source, inputLimit, progress)));
      if (task.kind === "read-scene") {
        const format = remote?.format || task.format;
        if (!["vsb", "vsj"].includes(format))
          throw new Error("The URL does not contain a VSB or VSJ scene");
        result = {
          ...(await import("./scene-reader.js")).readSceneDocument(
            buffer,
            format,
            limits,
          ),
          format,
          base: remote?.base || task.remote || null,
        };
      } else if (task.kind === "unzip") {
        const files = (await import("./archive.js")).unzipChecked(
          buffer,
          limits,
        );
        result = Object.fromEntries(
          [...files].map(([name, bytes]) => [name, bytes.buffer]),
        );
      } else {
        result ??= isCAD
          ? await (
              await import("./cad.js")
            ).parseCAD(buffer, name, limits, (phase) =>
              self.postMessage({
                id,
                progress: {
                  loaded: buffer.byteLength,
                  total: buffer.byteLength,
                  phase,
                },
              }),
            )
          : /\.3mf(?:[?#]|$)/i.test(name)
            ? (await import("./archive.js")).parse3MF(buffer, limits)
            : parseGeometry(buffer, name, limits);
        if (remote)
          Object.assign(result, {
            source_name: remote.name,
            file_bytes: remote.size,
          });
        if (task.features) {
          assertMemory(
            limits,
            derivedMemory(result.triangles, task.features),
            "view mode",
          );
          Object.assign(
            result,
            deriveGeometry(result.positions, task.features),
          );
        }
      }
    }
    self.postMessage({ id, result }, transfers(result));
  } catch (error) {
    self.postMessage({
      id,
      error:
        error instanceof RangeError
          ? "The browser could not allocate enough memory for this model. Try closing other tabs or using a device with more memory."
          : error?.message || String(error),
    });
  }
};
