import { DEFAULT_LIMITS } from "./geometry.js";
import { exportOptions, exportMemory } from "./export-options.js";
import { assertMemory } from "./memory.js";
import {
  OutputBudget,
  TextOutput,
  triangle,
  number,
  xml,
  vertexColor,
  faceColor,
  hexColor,
  progressReporter,
} from "./export-utils.js";

function writeSTL(models, budget, tick) {
  const count = models.reduce((n, m) => n + m.positions.length / 9, 0);
  if (count > 0xffffffff) throw new Error("STL triangle count limit exceeded");
  budget.add(84 + count * 50);
  const header = new Uint8Array(84);
  header.set(new TextEncoder().encode("Binary STL by ViewSTL 2"));
  new DataView(header.buffer).setUint32(80, count, true);
  const parts = [header];
  let block,
    view,
    offset = 0,
    written = 0;
  for (const model of models)
    for (let i = 0; i < model.positions.length; i += 9) {
      if (!block || offset === block.length) {
        block = new Uint8Array(Math.min(count - written, 16384) * 50);
        view = new DataView(block.buffer);
        parts.push(block);
        offset = 0;
      }
      const { vertices, normal } = triangle(model, i);
      const values = [...normal, ...vertices.flat()];
      for (let k = 0; k < values.length; k++) {
        if (!Number.isFinite(Math.fround(values[k])))
          throw new Error("STL coordinate exceeds float32 range");
        view.setFloat32(offset + k * 4, values[k], true);
      }
      // Standard binary STL: the attribute byte count is zero (no ambiguous color extension).
      offset += 50;
      written++;
      tick();
    }
  return new Blob(parts, { type: "model/stl" });
}

async function writeOBJ(models, options, budget, limits, tick) {
  const out = new TextOutput(budget),
    materialOut = new TextOutput(budget),
    materials = new Map();
  out.write(`# ViewSTL mesh export; units: ${options.units}\n`);
  if (options.colors) out.write("mtllib materials.mtl\n");
  let vertex = 0,
    normalIndex = 0,
    currentMaterial;
  for (const model of models) {
    // Names cannot inject OBJ statements, comments or delimiters.
    const name =
      String(model.name)
        .replace(/[^\p{L}\p{N}_.-]/gu, "_")
        .slice(0, 160) || "model";
    out.write(`o model_${model.id}_${name}\ns off\n`);
    for (let i = 0; i < model.positions.length; i += 9) {
      const { vertices, normal } = triangle(model, i);
      if (options.colors) {
        const key = hexColor(faceColor(model, i), model.opacity);
        let material = materials.get(key);
        if (material === undefined) {
          material = materials.size;
          materials.set(key, material);
          const rgb = [1, 3, 5].map(
            (k) => parseInt(key.slice(k, k + 2), 16) / 255,
          );
          materialOut.write(
            `newmtl material_${material}\nKd ${rgb.map(number).join(" ")}\nd ${number(parseInt(key.slice(7, 9), 16) / 255)}\nillum 1\n\n`,
          );
        }
        if (material !== currentMaterial) {
          out.write(`usemtl material_${material}\n`);
          currentMaterial = material;
        }
      }
      for (const p of vertices) out.write(`v ${p.map(number).join(" ")}\n`);
      out.write(`vn ${normal.map(number).join(" ")}\n`);
      normalIndex++;
      out.write(
        `f ${[1, 2, 3].map((k) => `${vertex + k}//${normalIndex}`).join(" ")}\n`,
      );
      vertex += 3;
      tick();
    }
  }
  const parts = out.finish();
  if (!options.colors) return new Blob(parts, { type: "model/obj" });
  return (await import("./export-zip.js")).zipExport(
    [
      ["model.obj", parts],
      ["materials.mtl", materialOut.finish()],
    ],
    limits,
  );
}

function indexedMesh(model) {
  const points = [],
    lookup = new Map(),
    indices = new Uint32Array(model.positions.length / 3),
    edges = new Map();
  let cursor = 0,
    volume = 0,
    origin;
  for (let i = 0; i < model.positions.length; i += 9) {
    const { vertices, degenerate } = triangle(model, i);
    if (degenerate)
      throw new Error("3MF export requires non-degenerate triangles");
    origin ??= vertices[0];
    const [a, b, c] = vertices.map((p) => p.map((v, k) => v - origin[k]));
    volume +=
      a[0] * (b[1] * c[2] - b[2] * c[1]) +
      a[1] * (b[2] * c[0] - b[0] * c[2]) +
      a[2] * (b[0] * c[1] - b[1] * c[0]);
    const ids = vertices.map((p) => {
      const key = p.map(number).join(",");
      let id = lookup.get(key);
      if (id === undefined) {
        id = points.length;
        lookup.set(key, id);
        points.push(p);
      }
      return id;
    });
    indices.set(ids, cursor);
    cursor += 3;
    for (let k = 0; k < 3; k++) {
      const a = ids[k],
        b = ids[(k + 1) % 3],
        key = Math.min(a, b) + ":" + Math.max(a, b);
      const edge = edges.get(key) || { count: 0, direction: 0 };
      edge.count++;
      edge.direction += a < b ? 1 : -1;
      edges.set(key, edge);
    }
  }
  for (const e of edges.values())
    if (e.count !== 2 || e.direction !== 0)
      throw new Error(
        "3MF export requires closed meshes with consistent triangle winding; use STL or OBJ for open surfaces",
      );
  if (!(volume > 0))
    throw new Error(
      "3MF export requires positive mesh volume and outward triangle winding",
    );
  return { points, indices };
}

async function write3MF(models, options, budget, limits, tick) {
  const out = new TextOutput(budget),
    palette = new Map();
  const colorKey = (model, offset) =>
    hexColor(vertexColor(model, offset), model.opacity);
  if (options.colors)
    for (const model of models)
      for (let i = 0; i < model.positions.length; i += 3) {
        const key = colorKey(model, i);
        if (!palette.has(key)) palette.set(key, palette.size);
      }
  out.write(
    `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="${options.units === "inch" ? "inch" : "millimeter"}" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"${options.colors ? ' xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02" recommendedextensions="m"' : ""}>\n<metadata name="Application">ViewSTL</metadata>\n<resources>\n`,
  );
  if (options.colors) {
    out.write('<m:colorgroup id="1">\n');
    for (const key of palette.keys()) out.write(`<m:color color="${key}"/>\n`);
    out.write("</m:colorgroup>\n");
  }
  for (let m = 0; m < models.length; m++) {
    const model = models[m],
      { points, indices } = indexedMesh(model);
    out.write(
      `<object id="${m + 2}" type="model" name="${xml(model.name)}"><mesh><vertices>\n`,
    );
    for (const p of points)
      out.write(
        `<vertex x="${number(p[0])}" y="${number(p[1])}" z="${number(p[2])}"/>\n`,
      );
    out.write("</vertices><triangles>\n");
    for (let i = 0; i < indices.length; i += 3) {
      let properties = "";
      if (options.colors) {
        const order = triangle(model, i * 3).reflected ? [0, 2, 1] : [0, 1, 2];
        properties =
          ' pid="1"' +
          order
            .map(
              (k, j) =>
                ` p${j + 1}="${palette.get(colorKey(model, i * 3 + k * 3))}"`,
            )
            .join("");
      }
      out.write(
        `<triangle v1="${indices[i]}" v2="${indices[i + 1]}" v3="${indices[i + 2]}"${properties}/>\n`,
      );
      tick();
    }
    out.write("</triangles></mesh></object>\n");
  }
  out.write("</resources><build>\n");
  models.forEach((_, i) => out.write(`<item objectid="${i + 2}"/>\n`));
  out.write("</build></model>\n");
  const encode = (s) => {
    const t = new TextOutput(budget);
    t.write(s);
    return t.finish();
  };
  const files = [
    ["3D/3dmodel.model", out.finish()],
    [
      "[Content_Types].xml",
      encode(
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>',
      ),
    ],
    [
      "_rels/.rels",
      encode(
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" Target="/3D/3dmodel.model"/></Relationships>',
      ),
    ],
  ];
  const blob = (await import("./export-zip.js")).zipExport(files, limits);
  return blob.slice(0, blob.size, "model/3mf");
}

export async function exportGeometry(
  models,
  inputOptions,
  limits = DEFAULT_LIMITS,
  progress = () => {},
) {
  const options = exportOptions(inputOptions);
  if (!Array.isArray(models) || !models.length)
    throw new Error("No models to export");
  let triangles = 0;
  for (const model of models) {
    if (
      !(model.positions instanceof Float32Array) ||
      !model.positions.length ||
      model.positions.length % 9
    )
      throw new Error("Invalid export geometry");
    if (
      model.matrix?.length !== 16 ||
      Array.from(model.matrix).some((v) => !Number.isFinite(v))
    )
      throw new Error("Invalid export transform");
    if (
      model.colors &&
      (!(model.colors instanceof Float32Array) ||
        model.colors.length !== model.positions.length)
    )
      throw new Error("Invalid export colors");
    if (options.colors) {
      for (const values of [model.colors, model.color])
        if (values)
          for (const v of values)
            if (!Number.isFinite(v) || v < 0 || v > 1)
              throw new Error("Invalid export colors");
      if (
        !Number.isFinite(model.opacity) ||
        model.opacity < 0 ||
        model.opacity > 1
      )
        throw new Error("Invalid export opacity");
    }
    triangles += model.positions.length / 9;
  }
  if (triangles > limits.max_triangles)
    throw new Error("Export triangle limit exceeded");
  assertMemory(
    limits,
    exportMemory(
      models.map((m) => ({ geometry: { triangles: m.positions.length / 9 } })),
      options,
    ),
    "export",
  );
  const archive =
    options.format === "3mf" || (options.format === "obj" && options.colors);
  const budget = new OutputBudget(
    archive ? limits.max_uncompressed_bytes : limits.max_file_bytes,
  );
  const tick = progressReporter(triangles, progress);
  let blob;
  if (options.format === "stl") blob = writeSTL(models, budget, tick);
  else if (options.format === "obj")
    blob = await writeOBJ(models, options, budget, limits, tick);
  else if (options.format === "3mf")
    blob = await write3MF(models, options, budget, limits, tick);
  else {
    const cad = await import("./export-cad.js");
    blob =
      options.format === "step"
        ? cad.writeSTEP(models, options, budget, tick)
        : cad.writeIGES(models, options, budget, tick);
  }
  progress({ loaded: triangles, total: triangles, phase: "complete" });
  return {
    blob,
    filename: options.filename,
    format: options.format,
    units: options.units,
    model_ids: models.map((m) => m.id),
    triangles,
    representation: "mesh",
  };
}
