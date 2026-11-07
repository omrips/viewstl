import { finishGeometry, DEFAULT_LIMITS } from "./geometry.js";
import { assertMemory, MEMORY_OVERHEAD, TRIANGLE_MEMORY } from "./memory.js";

// Both whole-buffer and chunked parsing use the same binary/color decoder.
export function binaryWriter(count, header, limits, inputBytes = 0) {
  if (count > limits.max_triangles) throw new Error("Triangle limit exceeded");
  assertMemory(limits, MEMORY_OVERHEAD + inputBytes + count * TRIANGLE_MEMORY);
  const positions = new Float32Array(count * 9);
  let colors = null;
  const text = new TextDecoder().decode(header),
    ci = text.indexOf("COLOR=");
  const magics = ci >= 0 && ci + 10 <= 80;
  const legacy = /^Binary colored STL by viewstl\.com/i.test(text);
  const fallback = magics
    ? [...header.subarray(ci + 6, ci + 9)].map((v) => v / 255)
    : [144 / 255, 144 / 255, 144 / 255];
  return {
    write(d, offset, t) {
      for (let k = 0; k < 9; k++)
        positions[t * 9 + k] = d.getFloat32(offset + 12 + k * 4, true);
      const attr = d.getUint16(offset + 48, true),
        colored = magics || legacy || !!(attr & 0x8000);
      if (colored && !colors) {
        colors = new Float32Array(count * 9);
        for (let i = 0; i < colors.length; i++) colors[i] = fallback[i % 3];
      }
      if (colored) {
        const c =
          magics && attr & 0x8000
            ? fallback
            : (magics || legacy
                ? [attr & 31, (attr >> 5) & 31, (attr >> 10) & 31]
                : [(attr >> 10) & 31, (attr >> 5) & 31, attr & 31]
              ).map((v) => v / 31);
        for (let k = 0; k < 9; k++) colors[t * 9 + k] = c[k % 3];
      }
    },
    finish() {
      return {
        ...finishGeometry(positions, colors, limits),
        format: "stl-binary",
      };
    },
  };
}

// File-backed binary STL needs only one small input chunk alongside final geometry,
// instead of retaining the entire input plus a second assembled input buffer.
// Null means ASCII/invalid input and delegates to the existing strict parser.
export async function parseBinarySTLBlob(
  source,
  limits = DEFAULT_LIMITS,
  progress = () => {},
  chunkTriangles = 65536,
) {
  if (source.size > limits.max_file_bytes)
    throw new Error("File size limit exceeded");
  if (!Number.isSafeInteger(chunkTriangles) || chunkTriangles < 1)
    throw new Error("Invalid chunk size");
  if (source.size < 84) return null;
  const header = await source.slice(0, 84).arrayBuffer();
  const count = new DataView(header).getUint32(80, true);
  if (!count || 84 + count * 50 !== source.size) return null;
  const writer = binaryWriter(count, new Uint8Array(header, 0, 80), limits);
  for (let start = 0; start < count; start += chunkTriangles) {
    const end = Math.min(count, start + chunkTriangles);
    const chunk = await source
      .slice(84 + start * 50, 84 + end * 50)
      .arrayBuffer();
    if (chunk.byteLength !== (end - start) * 50)
      throw new Error("Truncated binary STL");
    const d = new DataView(chunk);
    for (let t = start; t < end; t++) writer.write(d, (t - start) * 50, t);
    progress(84 + end * 50, source.size);
  }
  return writer.finish();
}

export function parseSTL(buffer, limits = DEFAULT_LIMITS) {
  if (
    !(buffer instanceof ArrayBuffer) ||
    buffer.byteLength > limits.max_file_bytes
  )
    throw new Error("Invalid or oversized STL");
  const d = new DataView(buffer),
    count = buffer.byteLength >= 84 ? d.getUint32(80, true) : 0;
  const binary = count > 0 && 84 + count * 50 === buffer.byteLength;
  let positions,
    colors = null;
  if (binary) {
    const writer = binaryWriter(
      count,
      new Uint8Array(buffer, 0, 80),
      limits,
      buffer.byteLength,
    );
    for (let t = 0; t < count; t++) writer.write(d, 84 + t * 50, t);
    return writer.finish();
  } else {
    assertMemory(limits, MEMORY_OVERHEAD + buffer.byteLength * 3);
    const text = new TextDecoder().decode(buffer);
    if (!/^\s*solid(?:\s|$)/i.test(text) || !/\bendsolid\b/i.test(text))
      throw new Error("Invalid or truncated STL");
    const pattern = /\bvertex\s+(\S+)\s+(\S+)\s+(\S+)/gi;
    let vertices = 0,
      match;
    while (pattern.exec(text)) {
      vertices++;
      if (vertices > limits.max_triangles * 3)
        throw new Error("Triangle limit exceeded");
      assertMemory(
        limits,
        MEMORY_OVERHEAD +
          buffer.byteLength * 3 +
          (vertices / 3) * TRIANGLE_MEMORY,
      );
    }
    if (
      !vertices ||
      vertices % 3 ||
      (text.match(/\bendfacet\b/gi) || []).length !== vertices / 3
    )
      throw new Error("Incomplete ASCII STL triangles");
    positions = new Float32Array(vertices * 3);
    pattern.lastIndex = 0;
    let i = 0;
    while ((match = pattern.exec(text)))
      for (let k = 1; k <= 3; k++) positions[i++] = Number(match[k]);
  }
  return {
    ...finishGeometry(positions, colors, limits),
    format: binary ? "stl-binary" : "stl-ascii",
  };
}
export function parseOBJ(buffer, limits = DEFAULT_LIMITS) {
  if (buffer.byteLength > limits.max_file_bytes)
    throw new Error("File size limit exceeded");
  assertMemory(limits, MEMORY_OVERHEAD + buffer.byteLength * 3);
  const text = new TextDecoder().decode(buffer),
    vertices = [],
    faces = [];
  for (const [line] of text.matchAll(/[^\r\n]+/g)) {
    const parts = line.trim().split(/\s+/);
    if (!parts[0] || parts[0].startsWith("#")) continue;
    if (parts[0] === "v") {
      if (parts.length < 4) throw new Error("Invalid OBJ vertex");
      const p = parts.slice(1, 4).map(Number);
      if (p.some((v) => !Number.isFinite(v)))
        throw new Error("Invalid OBJ coordinate");
      vertices.push(p);
      assertMemory(
        limits,
        MEMORY_OVERHEAD +
          buffer.byteLength * 3 +
          vertices.length * 128 +
          (faces.length / 3) * 320,
      );
      if (vertices.length > limits.max_triangles * 3)
        throw new Error("Vertex limit exceeded");
    } else if (parts[0] === "f") {
      const comment = parts.findIndex((p) => p.startsWith("#"));
      if (comment >= 0) parts.length = comment;
      if (parts.length < 4) throw new Error("Invalid OBJ face");
      const ids = parts.slice(1).map((p) => {
        const id = Number(p.split("/")[0]);
        const index = id < 0 ? vertices.length + id : id - 1;
        if (
          !Number.isInteger(id) ||
          id === 0 ||
          index < 0 ||
          index >= vertices.length
        )
          throw new Error("Invalid OBJ index");
        return index;
      });
      for (let j = 1; j < ids.length - 1; j++) {
        faces.push(ids[0], ids[j], ids[j + 1]);
        assertMemory(
          limits,
          MEMORY_OVERHEAD +
            buffer.byteLength * 3 +
            vertices.length * 128 +
            (faces.length / 3) * 320,
        );
        if (faces.length / 3 > limits.max_triangles)
          throw new Error("Triangle limit exceeded");
      }
    }
  }
  const positions = new Float32Array(faces.length * 3);
  faces.forEach((id, i) => positions.set(vertices[id], i * 3));
  return { ...finishGeometry(positions, null, limits), format: "obj" };
}
export function parseGeometry(buffer, name = "", limits = DEFAULT_LIMITS) {
  return /\.obj(?:[?#]|$)/i.test(name)
    ? parseOBJ(buffer, limits)
    : parseSTL(buffer, limits);
}
