// Loaded only for packaged VSB/3MF operations; excluded from the STL core.
import { Inflate, zipSync } from "fflate";
import { SaxesParser } from "saxes";
import { DEFAULT_LIMITS, finishGeometry, colorRGB } from "./geometry.js";
import { assertMemory, MEMORY_OVERHEAD, TRIANGLE_MEMORY } from "./memory.js";
import { identity, multiply, transform } from "./math.js";
const decoder = new TextDecoder("utf-8", { fatal: true });
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc(data, state = 0xffffffff) {
  for (const b of data) state = crcTable[(state ^ b) & 255] ^ (state >>> 8);
  return state >>> 0;
}
export function safePath(name) {
  if (
    !name ||
    name.includes("\\") ||
    name.startsWith("/") ||
    name.includes("\0") ||
    name.split("/").some((p) => p === ".." || p === ".") ||
    /^[a-z]+:/i.test(name)
  )
    throw new Error("Unsafe archive path");
  return name;
}
export function unzipChecked(buffer, limits = DEFAULT_LIMITS) {
  if (buffer.byteLength > limits.max_file_bytes)
    throw new Error("Archive size limit exceeded");
  const bytes = new Uint8Array(buffer),
    d = new DataView(buffer);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (
      d.getUint32(i, true) === 0x06054b50 &&
      i + 22 + d.getUint16(i + 20, true) === bytes.length
    ) {
      end = i;
      break;
    }
  if (end < 0) throw new Error("ZIP central directory not found");
  const count = d.getUint16(end + 10, true),
    size = d.getUint32(end + 12, true),
    start = d.getUint32(end + 16, true);
  if (
    d.getUint16(end + 4, true) ||
    d.getUint16(end + 6, true) ||
    count !== d.getUint16(end + 8, true)
  )
    throw new Error("Multi-disk ZIP is unsupported");
  if (count === 65535 || start === 0xffffffff || size === 0xffffffff)
    throw new Error("ZIP64 is unsupported");
  if (count > limits.max_archive_entries || start + size > end)
    throw new Error("Invalid or oversized ZIP directory");
  const entries = [],
    seen = new Set();
  let offset = start,
    total = 0;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > start + size || d.getUint32(offset, true) !== 0x02014b50)
      throw new Error("Invalid ZIP directory entry");
    const flags = d.getUint16(offset + 8, true),
      method = d.getUint16(offset + 10, true),
      checksum = d.getUint32(offset + 16, true),
      compressed = d.getUint32(offset + 20, true),
      original = d.getUint32(offset + 24, true);
    const n = d.getUint16(offset + 28, true),
      extra = d.getUint16(offset + 30, true),
      comment = d.getUint16(offset + 32, true),
      local = d.getUint32(offset + 42, true);
    if (offset + 46 + n + extra + comment > start + size)
      throw new Error("Truncated ZIP directory");
    const name = safePath(
      decoder.decode(bytes.subarray(offset + 46, offset + 46 + n)),
    );
    if (seen.has(name)) throw new Error("Duplicate archive entry");
    seen.add(name);
    if (flags & 1 || ![0, 8].includes(method))
      throw new Error("Encrypted or unsupported ZIP compression");
    total += original;
    assertMemory(
      limits,
      MEMORY_OVERHEAD + buffer.byteLength + total * 4,
      "expanded archive",
    );
    if (total > limits.max_uncompressed_bytes)
      throw new Error("Archive expansion limit exceeded");
    entries.push({ name, method, checksum, compressed, original, local });
    offset += 46 + n + extra + comment;
  }
  if (offset !== start + size) throw new Error("ZIP directory size mismatch");
  const files = new Map();
  for (const e of entries) {
    const o = e.local;
    if (o + 30 > start || d.getUint32(o, true) !== 0x04034b50)
      throw new Error("Invalid ZIP local header");
    const n = d.getUint16(o + 26, true),
      extra = d.getUint16(o + 28, true),
      dataStart = o + 30 + n + extra;
    if (
      dataStart + e.compressed > start ||
      d.getUint16(o + 8, true) !== e.method ||
      d.getUint16(o + 6, true) & 1 ||
      decoder.decode(bytes.subarray(o + 30, o + 30 + n)) !== e.name
    )
      throw new Error("ZIP header mismatch");
    const out = new Uint8Array(e.original);
    let written = 0,
      state = 0xffffffff,
      finished = false;
    const consume = (chunk, final) => {
      if (written + chunk.length > out.length)
        throw new Error("ZIP entry exceeds declared size");
      out.set(chunk, written);
      written += chunk.length;
      state = crc(chunk, state);
      finished = final;
    };
    if (e.method === 0)
      consume(bytes.subarray(dataStart, dataStart + e.compressed), true);
    else {
      const inflate = new Inflate(consume);
      for (let p = 0; p < e.compressed; p += 1024)
        inflate.push(
          bytes.subarray(
            dataStart + p,
            dataStart + Math.min(p + 1024, e.compressed),
          ),
          p + 1024 >= e.compressed,
        );
    }
    if (
      !finished ||
      written !== e.original ||
      (state ^ 0xffffffff) >>> 0 !== e.checksum
    )
      throw new Error("ZIP checksum or length mismatch");
    if (!e.name.endsWith("/")) files.set(e.name, out);
  }
  return files;
}
export function zipScene(scene, limits = DEFAULT_LIMITS) {
  const files = Object.create(null);
  files["json_data.vsj"] = new TextEncoder().encode(JSON.stringify(scene.vsj));
  let total = files["json_data.vsj"].length;
  for (const file of scene.files) {
    const name = safePath(`${file.id}.stl`);
    const bytes = new Uint8Array(file.bin);
    total += bytes.length;
    files[name] = bytes;
  }
  if (
    Object.keys(files).length > limits.max_archive_entries ||
    total > limits.max_uncompressed_bytes
  )
    throw new Error("Scene archive limit exceeded");
  const zip = zipSync(files, { level: 6 });
  if (zip.length > limits.max_file_bytes)
    throw new Error("Archive size limit exceeded");
  return zip.buffer;
}
function parseXML(bytes, open, close = () => {}) {
  const parser = new SaxesParser({ xmlns: true });
  parser.on("doctype", () => {
    throw new Error("XML document types are not supported");
  });
  parser.on("error", (error) => {
    throw error;
  });
  parser.on("opentag", (tag) => {
    const a = Object.create(null);
    for (const v of Object.values(tag.attributes)) a[v.local] = v.value;
    open(tag.local, a, tag);
  });
  parser.on("closetag", (tag) => close(tag.local));
  parser.write(decoder.decode(bytes)).close();
}
function matrix(value) {
  if (!value) return identity();
  const v = value.trim().split(/\s+/).map(Number);
  if (v.length !== 12 || v.some((x) => !Number.isFinite(x)))
    throw new Error("Invalid 3MF transform");
  return new Float64Array([
    v[0],
    v[1],
    v[2],
    0,
    v[3],
    v[4],
    v[5],
    0,
    v[6],
    v[7],
    v[8],
    0,
    v[9],
    v[10],
    v[11],
    1,
  ]);
}
export function parse3MF(buffer, limits = DEFAULT_LIMITS) {
  const files = unzipChecked(buffer, limits);
  const baseMemory =
    MEMORY_OVERHEAD +
    buffer.byteLength +
    [...files.values()].reduce((sum, b) => sum + b.byteLength * 3, 0);
  let path = null;
  if (files.has("_rels/.rels"))
    parseXML(files.get("_rels/.rels"), (name, a) => {
      if (name === "Relationship" && a.Type?.endsWith("/3dmodel")) {
        if (a.TargetMode === "External")
          throw new Error("External 3MF resources are unsupported");
        path = safePath(a.Target.replace(/^\//, ""));
      }
    });
  path ??= [...files.keys()].find((k) => /^3d\/3dmodel\.model$/i.test(k));
  if (!path || !files.has(path)) throw new Error("3MF model part not found");
  const objects = new Map(),
    materials = new Map(),
    build = [];
  let current = null,
    resource = null,
    inBuild = false,
    unit = 1,
    triangles = 0,
    vertices = 0,
    root = false;
  parseXML(
    files.get(path),
    (name, a, tag) => {
      if (name === "model") {
        if (root) throw new Error("Multiple 3MF roots");
        root = true;
        const scales = {
          micron: 0.001,
          millimeter: 1,
          centimeter: 10,
          inch: 25.4,
          foot: 304.8,
          meter: 1000,
        };
        unit = scales[a.unit || "millimeter"];
        if (!unit) throw new Error("Unsupported 3MF unit");
        for (const prefix of (a.requiredextensions || "")
          .split(/\s+/)
          .filter(Boolean))
          if (!/material\/2015\/02$/.test(tag.ns[prefix] || ""))
            throw new Error(`Unsupported required 3MF extension: ${prefix}`);
      } else if (name === "object") {
        if (objects.has(a.id)) throw new Error("Duplicate 3MF object");
        current = {
          id: a.id,
          vertices: [],
          triangles: [],
          components: [],
          pid: a.pid,
          pindex: a.pindex,
        };
        objects.set(a.id, current);
      } else if (name === "vertex" && current) {
        const p = [Number(a.x), Number(a.y), Number(a.z)];
        if (p.some((v) => !Number.isFinite(v)))
          throw new Error("Invalid 3MF vertex");
        current.vertices.push(p);
        if (++vertices > limits.max_triangles * 3)
          throw new Error("3MF vertex limit exceeded");
        assertMemory(limits, baseMemory + vertices * 128 + triangles * 320);
      } else if (name === "triangle" && current) {
        current.triangles.push(a);
        if (++triangles > limits.max_triangles)
          throw new Error("Triangle limit exceeded");
        assertMemory(limits, baseMemory + vertices * 128 + triangles * 320);
      } else if (name === "component" && current) {
        if (a.path) throw new Error("External 3MF components are unsupported");
        current.components.push({
          id: a.objectid,
          matrix: matrix(a.transform),
        });
      } else if (name === "build") inBuild = true;
      else if (name === "item" && inBuild) {
        if (a.path) throw new Error("External 3MF build items are unsupported");
        if (a.printable !== "0")
          build.push({ id: a.objectid, matrix: matrix(a.transform) });
      } else if (name === "basematerials" || name === "colorgroup") {
        resource = [];
        materials.set(a.id, resource);
      } else if ((name === "base" || name === "color") && resource) {
        const color = a.displaycolor || a.color;
        if (!/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(color || ""))
          throw new Error("Invalid 3MF color");
        resource.push(colorRGB(color.slice(0, 7)));
      } else if (
        name === "texture2d" ||
        name === "texture2dgroup" ||
        name === "multiproperties"
      )
        throw new Error(
          "3MF textures and composite materials are not supported",
        );
    },
    (name) => {
      if (name === "object") current = null;
      if (name === "build") inBuild = false;
      if (name === "basematerials" || name === "colorgroup") resource = null;
    },
  );
  if (!root || !build.length) throw new Error("3MF build is empty");
  const instances = [];
  let total = 0,
    visits = 0;
  const visit = (id, parent, stack) => {
    if (stack.includes(id) || stack.length >= 64)
      throw new Error("Cyclic or excessively nested 3MF components");
    if (++visits > limits.max_archive_entries * 1024)
      throw new Error("3MF component expansion limit exceeded");
    const obj = objects.get(id);
    if (!obj) throw new Error("Missing 3MF object");
    total += obj.triangles.length;
    if (total > limits.max_triangles)
      throw new Error("Expanded triangle limit exceeded");
    assertMemory(
      limits,
      baseMemory + vertices * 128 + triangles * 320 + total * TRIANGLE_MEMORY,
      "expanded model",
    );
    if (obj.triangles.length) instances.push({ obj, matrix: parent });
    for (const c of obj.components)
      visit(c.id, multiply(parent, c.matrix), [...stack, id]);
  };
  for (const item of build) visit(item.id, item.matrix, []);
  const positions = new Float32Array(total * 9),
    colors = new Float32Array(total * 9);
  let index = 0,
    hasColors = false;
  for (const instance of instances)
    for (const face of instance.obj.triangles) {
      for (let k = 0; k < 3; k++) {
        const id = Number(face[`v${k + 1}`]);
        if (
          !Number.isInteger(id) ||
          id < 0 ||
          id >= instance.obj.vertices.length
        )
          throw new Error("Invalid 3MF triangle index");
        positions.set(
          transform(instance.matrix, instance.obj.vertices[id]).map(
            (v) => v * unit,
          ),
          index,
        );
        const pid = face.pid ?? instance.obj.pid,
          pindex = Number(
            face[`p${k + 1}`] ?? face.p1 ?? instance.obj.pindex ?? 0,
          );
        let color = [144 / 255, 144 / 255, 144 / 255];
        if (pid !== undefined) {
          color = materials.get(pid)?.[pindex];
          if (!color)
            throw new Error("Unsupported or invalid 3MF material reference");
          hasColors = true;
        }
        colors.set(color, index);
        index += 3;
      }
    }
  return {
    ...finishGeometry(positions, hasColors ? colors : null, limits),
    format: "3mf",
  };
}
