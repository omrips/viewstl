// Optional STEP/IGES importer. Only loaded by a disposable parsing worker.
import { DEFAULT_LIMITS, finishGeometry } from "./geometry.js";
import { assertMemory, TRIANGLE_MEMORY } from "./memory.js";

export const CAD_OVERHEAD = 128 * 1024 ** 2;
export function cadMemory(inputBytes) {
  // CAD topology is substantially larger than its text representation.
  return CAD_OVERHEAD + inputBytes * 40;
}
async function loadCAD(options) {
  const { default: factory } = await import(
    new URL("../cad/occt-import-js.js", import.meta.url).href
  );
  return factory({
    ...options,
    locateFile: () =>
      new URL("../cad/occt-import-js.wasm", import.meta.url).href,
  });
}

export function cadGeometry(result, limits = DEFAULT_LIMITS, workingBytes = 0) {
  if (
    !result?.success ||
    !Array.isArray(result.meshes) ||
    !result.meshes.length
  )
    throw new Error(
      "No supported surfaces were found in this CAD file. Export a self-contained STEP or IGES solid/surface model.",
    );
  let triangles = 0,
    arrayBytes = 0,
    hasColors = false;
  for (const mesh of result.meshes) {
    const positions = mesh.attributes?.position?.array,
      indices = mesh.index?.array;
    if (
      !positions?.length ||
      positions.length % 3 ||
      !indices ||
      indices.length % 3
    )
      throw new Error("Invalid CAD mesh");
    triangles += indices.length / 3;
    if (!Number.isSafeInteger(triangles) || triangles > limits.max_triangles)
      throw new Error("Triangle limit exceeded");
    arrayBytes +=
      (positions.length +
        indices.length +
        (mesh.attributes.normal?.array?.length || 0)) *
      16;
    hasColors ||= !!mesh.color || !!mesh.brep_faces?.some((face) => face.color);
  }
  if (!triangles)
    throw new Error("This CAD file contains no viewable surfaces.");
  assertMemory(
    limits,
    workingBytes + arrayBytes + triangles * TRIANGLE_MEMORY,
    "CAD model",
  );
  const positions = new Float32Array(triangles * 9);
  const colors = hasColors ? new Float32Array(positions.length) : null;
  const fallback = [144 / 255, 144 / 255, 144 / 255];
  let offset = 0;
  function colorAt(color, start, end) {
    if (
      !color ||
      color.length !== 3 ||
      color.some((v) => !Number.isFinite(v) || v < 0 || v > 1)
    )
      throw new Error("Invalid CAD color");
    for (let p = start; p < end; p += 3) colors.set(color, p);
  }
  // OCCT has already applied assembly placements to each mesh's vertices.
  // Preserve those coordinates; one source file remains one selectable model.
  for (const mesh of result.meshes) {
    const source = mesh.attributes.position.array,
      indices = mesh.index.array;
    for (let i = 0; i < indices.length; i++) {
      const index = indices[i];
      if (
        !Number.isSafeInteger(index) ||
        index < 0 ||
        index * 3 + 2 >= source.length
      )
        throw new Error("Invalid CAD triangle index");
      for (let axis = 0; axis < 3; axis++)
        positions[offset + i * 3 + axis] = source[index * 3 + axis];
    }
    if (colors) {
      colorAt(mesh.color || fallback, offset, offset + indices.length * 3);
      for (const face of mesh.brep_faces || []) {
        if (!face.color) continue;
        if (
          !Number.isSafeInteger(face.first) ||
          !Number.isSafeInteger(face.last) ||
          face.first < 0 ||
          face.last < face.first ||
          face.last >= indices.length / 3
        )
          throw new Error("Invalid CAD face range");
        colorAt(
          face.color,
          offset + face.first * 9,
          offset + (face.last + 1) * 9,
        );
      }
    }
    offset += indices.length * 3;
  }
  return finishGeometry(positions, colors, limits);
}

export async function parseCAD(
  buffer,
  name,
  limits = DEFAULT_LIMITS,
  progress = () => {},
  initialize = loadCAD,
) {
  const extension = /\.(step|stp|iges|igs)(?:[?#]|$)/i
    .exec(name)?.[1]
    .toLowerCase();
  if (!extension) throw new Error("Unsupported CAD format");
  if (
    !(buffer instanceof ArrayBuffer) ||
    !buffer.byteLength ||
    buffer.byteLength > limits.max_file_bytes
  )
    throw new Error("Invalid or oversized CAD file");
  assertMemory(limits, cadMemory(buffer.byteLength), "CAD file");
  // Bound the WASM heap separately; admission/output checks also budget JS data.
  const heapLimit =
    Math.floor(
      Math.min(
        512 * 1024 ** 2,
        ((limits.max_memory_bytes ?? Number.MAX_SAFE_INTEGER) -
          CAD_OVERHEAD -
          buffer.byteLength * 3) /
          2,
      ) / 65536,
    ) * 65536;
  if (heapLimit < 32 * 1024 ** 2)
    throw new Error("CAD import exceeds the device safety budget.");
  progress("loading-cad");
  let engine;
  try {
    engine = await initialize({
      viewstlMaxHeapBytes: heapLimit,
      print() {},
      printErr() {},
    });
  } catch {
    throw new Error(
      "The CAD reader could not start. Check the connection and that WebAssembly is allowed, then try again.",
    );
  }
  progress("parsing-cad");
  const format = /^(step|stp)$/.test(extension) ? "step" : "iges";
  let result;
  try {
    result = engine[format === "step" ? "ReadStepFile" : "ReadIgesFile"](
      new Uint8Array(buffer),
      {
        linearUnit: "millimeter",
        linearDeflectionType: "bounding_box_ratio",
        linearDeflection: 0.001,
        angularDeflection: 0.5,
      },
    );
  } catch {
    throw new Error(
      "This CAD file could not be processed within the reader limits. Try a smaller or simplified STEP/IGES export.",
    );
  }
  const geometry = cadGeometry(
    result,
    limits,
    CAD_OVERHEAD + buffer.byteLength * 3 + engine.HEAPU8.byteLength,
  );
  return { ...geometry, format, units: "mm" };
}
