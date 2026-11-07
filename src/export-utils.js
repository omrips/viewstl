import { cross, sub, norm, transform } from "./math.js";

export const number = (value) => {
  if (!Number.isFinite(value)) throw new Error("Non-finite export coordinate");
  return Object.is(value, -0) ? "0" : String(value);
};
export const xml = (value) =>
  String(value)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    .replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c],
    );

export class OutputBudget {
  constructor(limit) {
    this.limit = limit;
    this.bytes = 0;
  }
  add(bytes) {
    this.bytes += bytes;
    if (this.bytes > this.limit) throw new Error("Export size limit exceeded");
  }
}

// Encode small batches, avoiding a second complete UTF-16 copy of large text files.
export class TextOutput {
  constructor(budget) {
    this.budget = budget;
    this.parts = [];
    this.pending = "";
  }
  write(text) {
    this.pending += text;
    if (this.pending.length >= 32768) this.flush();
  }
  flush() {
    if (!this.pending) return;
    const bytes = new TextEncoder().encode(this.pending);
    this.budget.add(bytes.byteLength);
    this.parts.push(bytes);
    this.pending = "";
  }
  finish() {
    this.flush();
    return this.parts;
  }
}

export function triangle(model, offset) {
  const p = model.positions,
    m = model.matrix;
  const vertices = [0, 3, 6].map((k) =>
    transform(m, [p[offset + k], p[offset + k + 1], p[offset + k + 2]]),
  );
  if (vertices.flat().some((v) => !Number.isFinite(v)))
    throw new Error("Non-finite export coordinate");
  // Preserve outward winding under reflections, including callers of the worker directly.
  const determinant =
    m[0] * (m[5] * m[10] - m[9] * m[6]) -
    m[4] * (m[1] * m[10] - m[9] * m[2]) +
    m[8] * (m[1] * m[6] - m[5] * m[2]);
  if (determinant < 0) [vertices[1], vertices[2]] = [vertices[2], vertices[1]];
  const normal = cross(
    sub(vertices[1], vertices[0]),
    sub(vertices[2], vertices[0]),
  );
  if (!Number.isFinite(Math.hypot(...normal)))
    throw new Error("Geometry magnitude exceeds export limits");
  return {
    vertices,
    normal: norm(normal),
    degenerate: !Math.hypot(...normal),
    reflected: determinant < 0,
  };
}

export function vertexColor(model, offset) {
  return (
    model.color ||
    (model.colors
      ? Array.from(model.colors.subarray(offset, offset + 3))
      : [144 / 255, 144 / 255, 144 / 255])
  );
}
export const hexColor = (c, opacity = 1) =>
  "#" +
  [...c, opacity]
    .map((v) =>
      Math.round(Math.max(0, Math.min(1, v)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase();
export const faceColor = (m, offset) =>
  [0, 1, 2].map(
    (a) =>
      (vertexColor(m, offset)[a] +
        vertexColor(m, offset + 3)[a] +
        vertexColor(m, offset + 6)[a]) /
      3,
  );

export function progressReporter(total, callback) {
  let done = 0;
  callback({ loaded: 0, total, phase: "exporting" });
  return () => {
    done++;
    if (done % 1024 === 0 || done === total)
      callback({ loaded: done, total, phase: "exporting" });
  };
}
