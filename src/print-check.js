import { transform } from "./math.js";
import { printOptions, printMemory } from "./print-options.js";
import { assertMemory } from "./memory.js";
import {
  makeTree,
  visitPairs,
  trianglesIntersect,
  triangleAt,
  sub,
  cross,
  dot,
  rayQuery,
} from "./print-spatial.js";

const definitions = [
  ["degenerate_faces", "Degenerate triangles", "error"],
  ["near_degenerate_faces", "Very small or thin triangles", "warning"],
  ["duplicate_faces", "Duplicate triangles", "error"],
  ["boundary_edges", "Open boundaries", "error"],
  ["nonmanifold_edges", "Non-manifold edges", "error"],
  ["nonmanifold_vertices", "Non-manifold vertices", "error"],
  ["winding", "Triangle winding", "error"],
  ["components", "Separate connected parts", "info"],
  ["intersections", "Self-intersections", "error"],
  ["shell_orientation", "Shell orientation and volume", "error"],
  ["units", "Physical units", "warning"],
  ["build_volume", "Build volume fit", "warning"],
  ["overhangs", "Overhangs", "warning"],
  ["bed_contact", "Bed contact", "warning"],
  ["thin_walls", "Thin walls / small features", "warning"],
];

export function checkMesh(model, input = {}, limits = {}, progress = () => {}) {
  const settings = printOptions(input),
    n = model.positions.length / 9;
  if (
    !(model.positions instanceof Float32Array) ||
    !Number.isSafeInteger(n) ||
    n < 1 ||
    model.matrix?.length !== 16 ||
    Array.from(model.matrix).some((v) => !Number.isFinite(v))
  )
    throw new Error("Invalid print-check geometry");
  if (n > (limits.max_triangles ?? 5_000_000))
    throw new Error("Print check triangle limit exceeded");
  assertMemory(limits, printMemory(n), "print check");
  const start = performance.now(),
    deadline = start + settings.max_time_ms;
  let ticks = 0,
    stage = "Topology";
  const tick = () => {
    if (++ticks % 128 === 0) {
      if (performance.now() > deadline) throw new Error("PRINT_TIME_LIMIT");
      progress({ phase: stage, elapsed_ms: performance.now() - start });
    }
  };
  const checks = definitions.map(([code, label, severity]) => ({
    code,
    label,
    severity,
    status: "not_run",
    count: 0,
    triangle_ids: [],
    edge_vertices: [],
    message: "Not run",
  }));
  const get = (code) => checks.find((c) => c.code === code);
  const mark = (code, status, message) =>
    Object.assign(get(code), { status, message });
  const issue = (code, face) => {
    const c = get(code);
    c.count++;
    if (face != null && c.triangle_ids.length < 128) c.triangle_ids.push(face);
  };
  const finish = (code, message) => {
    const c = get(code);
    c.status = c.count ? "issue" : "pass";
    c.message = message || `${c.count} found`;
  };
  const positions = new Float64Array(model.positions.length),
    min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  let topologyComplete = false,
    tree,
    volumes = [],
    componentFaces = [],
    rootOf,
    eps = 0;
  const report = {
    model_id: model.id,
    name: model.name,
    triangles: n,
    checks,
    settings,
    dimensions_mm: null,
    volume_mm3: null,
    volume_valid: false,
    elapsed_ms: 0,
    summary: "incomplete",
  };
  try {
    progress({ phase: stage, elapsed_ms: 0 });
    for (let i = 0; i < model.positions.length; i += 3) {
      if (i % 3072 === 0) tick();
      const p = transform(
        model.matrix,
        Array.from(model.positions.subarray(i, i + 3)),
      );
      if (p.some((v) => !Number.isFinite(v)))
        throw new Error("Invalid print-check coordinate");
      positions.set(p, i);
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], p[k]);
        max[k] = Math.max(max[k], p[k]);
      }
    }
    report.dimensions_mm = max.map((v, k) => v - min[k]);
    const span = Math.max(...report.dimensions_mm),
      magnitude = Math.max(...min.map(Math.abs), ...max.map(Math.abs));
    eps = Math.max(span * 1e-10, magnitude * Number.EPSILON * 64, 1e-12);
    report.tolerance_mm = eps;
    // Translate analysis coordinates close to the origin, preserving the input mesh.
    for (let i = 0; i < positions.length; i++) positions[i] -= min[i % 3];
    const ids = new Uint32Array(n * 3),
      vertices = [],
      lookup = new Map(),
      edges = new Map(),
      faces = new Map(),
      incidence = [];
    const parents = Int32Array.from({ length: n }, (_, i) => i);
    const find = (i) => {
      while (parents[i] !== i) {
        parents[i] = parents[parents[i]];
        i = parents[i];
      }
      return i;
    };
    const join = (a, b) => {
      a = find(a);
      b = find(b);
      if (a !== b) parents[b] = a;
    };
    for (let i = 0; i < n; i++) {
      tick();
      for (let k = 0; k < 3; k++) {
        const offset = i * 9 + k * 3,
          key = Array.from(model.positions.subarray(offset, offset + 3)).join(
            ",",
          );
        let id = lookup.get(key);
        if (id === undefined) {
          id = vertices.length;
          lookup.set(key, id);
          vertices.push(offset);
          incidence.push([]);
        }
        ids[i * 3 + k] = id;
        incidence[id].push(i);
      }
      const tri = triangleAt(positions, i),
        normal = cross(sub(tri[1], tri[0]), sub(tri[2], tri[0])),
        area = Math.hypot(...normal);
      if (!area) issue("degenerate_faces", i);
      else if (
        area <=
        eps *
          Math.max(
            ...tri.map((p, k) => Math.hypot(...sub(p, tri[(k + 1) % 3]))),
          )
      )
        issue("near_degenerate_faces", i);
      const key = Array.from(ids.subarray(i * 3, i * 3 + 3))
        .sort((a, b) => a - b)
        .join(":");
      if (faces.has(key)) issue("duplicate_faces", i);
      else faces.set(key, i);
      for (let k = 0; k < 3; k++) {
        const a = ids[i * 3 + k],
          b = ids[i * 3 + ((k + 1) % 3)],
          key = Math.min(a, b) + ":" + Math.max(a, b);
        let edge = edges.get(key);
        if (!edge) {
          edge = { a, b, faces: [], direction: 0 };
          edges.set(key, edge);
        }
        if (edge.faces.length) join(i, edge.faces[0]);
        edge.faces.push(i);
        edge.direction += a < b ? 1 : -1;
      }
    }
    const badVertices = new Set();
    for (const edge of edges.values()) {
      tick();
      let code;
      if (edge.faces.length === 1) code = "boundary_edges";
      else if (edge.faces.length !== 2) {
        code = "nonmanifold_edges";
        badVertices.add(edge.a);
        badVertices.add(edge.b);
      } else if (edge.direction !== 0) code = "winding";
      if (code) {
        issue(code, edge.faces[0]);
        const c = get(code);
        if (c.edge_vertices.length < 256 * 6)
          c.edge_vertices.push(
            ...model.positions.subarray(vertices[edge.a], vertices[edge.a] + 3),
            ...model.positions.subarray(vertices[edge.b], vertices[edge.b] + 3),
          );
      }
    }
    // A closed vertex must have one face fan, not two solids touching at a point.
    for (let v = 0; v < incidence.length; v++) {
      tick();
      if (badVertices.has(v)) {
        issue("nonmanifold_vertices", incidence[v][0]);
        continue;
      }
      const around = new Set(incidence[v]),
        seen = new Set(),
        stack = [incidence[v][0]];
      while (stack.length) {
        tick();
        const f = stack.pop();
        if (seen.has(f)) continue;
        seen.add(f);
        for (let k = 0; k < 3; k++) {
          const a = ids[f * 3 + k],
            b = ids[f * 3 + ((k + 1) % 3)];
          if (a !== v && b !== v) continue;
          const e = edges.get(Math.min(a, b) + ":" + Math.max(a, b));
          for (const next of e.faces) if (!seen.has(next)) stack.push(next);
        }
      }
      if (seen.size !== around.size)
        issue("nonmanifold_vertices", incidence[v][0]);
    }
    const roots = new Map();
    rootOf = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      tick();
      const r = find(i);
      if (!roots.has(r)) {
        roots.set(r, roots.size);
        componentFaces.push([]);
        volumes.push(0);
      }
      const c = roots.get(r);
      rootOf[i] = c;
      componentFaces[c].push(i);
      const tri = triangleAt(positions, i),
        origin = triangleAt(positions, componentFaces[c][0])[0];
      volumes[c] +=
        dot(
          sub(tri[0], origin),
          cross(sub(tri[1], origin), sub(tri[2], origin)),
        ) / 6;
    }
    for (const code of [
      "degenerate_faces",
      "near_degenerate_faces",
      "duplicate_faces",
      "boundary_edges",
      "nonmanifold_edges",
      "nonmanifold_vertices",
      "winding",
    ])
      finish(code);
    get("components").count = roots.size;
    mark(
      "components",
      roots.size > 1 ? "issue" : "pass",
      `${roots.size} connected part${roots.size === 1 ? "" : "s"}. Separate parts can be intentional.`,
    );
    topologyComplete = true;
    mark(
      "units",
      model.source_units || settings.units_confirmed ? "pass" : "inconclusive",
      model.source_units
        ? `File units: ${model.source_units}; measurements in mm.`
        : settings.units_confirmed
          ? "Current scale confirmed as millimetres."
          : "File has no physical units. Confirm the current millimetre scale before using size estimates.",
    );
    const profile = settings.profile;
    if (profile?.build_volume_mm) {
      get("build_volume").count = report.dimensions_mm.filter(
        (v, k) => v > profile.build_volume_mm[k] + eps,
      ).length;
      finish(
        "build_volume",
        get("build_volume").count
          ? "Exceeds the supplied build volume in the current orientation. Try another orientation or scale in your slicer."
          : "Fits by dimensions only in the current orientation; placement and printer exclusions are not checked.",
      );
    }
    const solidBasics = checks
      .filter((c) => c.severity === "error" && c.status !== "not_run")
      .every((c) => c.status === "pass");
    if (settings.level === "detailed") {
      stage = "Spatial index";
      tree = makeTree(positions, tick);
      stage = "Self-intersections";
      let uncertain = 0;
      visitPairs(
        tree,
        eps,
        (a, b) => {
          tick();
          const shared = Array.from(ids.subarray(a * 3, a * 3 + 3)).filter(
            (v) => ids.subarray(b * 3, b * 3 + 3).includes(v),
          ).length;
          const hit = trianglesIntersect(
            triangleAt(positions, a),
            triangleAt(positions, b),
            shared,
            eps,
          );
          if (hit === 1) {
            issue("intersections", a);
            const c = get("intersections");
            if (c.triangle_ids.length < 128) c.triangle_ids.push(b);
          } else if (hit === 2) uncertain++;
        },
        tick,
      );
      finish("intersections");
      if (uncertain && !get("intersections").count)
        mark(
          "intersections",
          "inconclusive",
          `${uncertain} near-contact pairs require inspection at the reported numerical tolerance.`,
        );
      if (solidBasics && get("intersections").status === "pass") {
        stage = "Shell containment";
        let ambiguous = false;
        for (let c = 0; c < componentFaces.length; c++) {
          tick();
          const tri = triangleAt(positions, componentFaces[c][0]),
            point = [0, 1, 2].map(
              (k) => (tri[0][k] + tri[1][k] + tri[2][k]) / 3,
            );
          let depth = null;
          for (const direction of [
            [1, 0.371, 0.529],
            [0.217, 1, 0.413],
            [0.317, 0.193, 1],
          ]) {
            const hits = rayQuery(
              tree,
              positions,
              point,
              direction,
              eps,
              (id) => rootOf[id] !== c,
              tick,
            );
            if (hits.some((h) => h.edge)) continue;
            const counts = new Map();
            for (const h of hits)
              counts.set(rootOf[h.id], (counts.get(rootOf[h.id]) || 0) + 1);
            depth = [...counts.values()].filter((v) => v % 2 === 1).length;
            break;
          }
          if (depth === null) {
            ambiguous = true;
            continue;
          }
          if (
            Math.abs(volumes[c]) <= eps ** 3 ||
            Math.sign(volumes[c]) !== (depth % 2 ? -1 : 1)
          )
            issue("shell_orientation", componentFaces[c][0]);
        }
        finish(
          "shell_orientation",
          "Outer shells must face outward; cavity shells face inward.",
        );
        if (ambiguous && !get("shell_orientation").count)
          mark(
            "shell_orientation",
            "inconclusive",
            "Shell containment is numerically ambiguous.",
          );
        if (get("shell_orientation").status === "pass") {
          report.volume_mm3 = volumes.reduce((a, b) => a + b, 0);
          report.volume_valid = true;
        }
      } else
        mark(
          "shell_orientation",
          "inconclusive",
          "Requires a closed, consistently wound mesh without intersections.",
        );
    } else
      mark(
        "shell_orientation",
        "not_run",
        "Run Detailed check for intersections, nested shells and validated volume.",
      );
    if (profile) {
      stage = "FDM estimates";
      const physical = get("units").status === "pass";
      if (!physical)
        for (const code of ["build_volume", "bed_contact", "thin_walls"])
          mark(code, "inconclusive", "Confirm physical units first.");
      if (profile.overhang_degrees != null) {
        if (
          !solidBasics ||
          (settings.level === "detailed"
            ? !report.volume_valid
            : componentFaces.length !== 1 || volumes[0] <= 0)
        )
          mark(
            "overhangs",
            "inconclusive",
            "Fix triangle winding and mesh defects before estimating overhangs.",
          );
        else {
          const threshold = -Math.sin(
            (profile.overhang_degrees * Math.PI) / 180,
          );
          let area = 0;
          for (let i = 0; i < n; i++) {
            tick();
            const t = triangleAt(positions, i),
              normal = cross(sub(t[1], t[0]), sub(t[2], t[0])),
              length = Math.hypot(...normal);
            if (t.every((p) => p[2] <= eps * 8)) continue;
            if (normal[2] / length < threshold) {
              issue("overhangs", i);
              area += length / 2;
            }
          }
          get("overhangs").estimated = true;
          get("overhangs").area_mm2 = area;
          finish(
            "overhangs",
            `Potential support regions above ${profile.overhang_degrees}° from vertical. +Z is up; bridges/supports are not simulated.`,
          );
        }
      }
      if (physical) {
        let contact = 0;
        for (let i = 0; i < n; i++) {
          tick();
          const t = triangleAt(positions, i);
          if (t.every((p) => p[2] <= eps * 8))
            contact +=
              Math.hypot(...cross(sub(t[1], t[0]), sub(t[2], t[0]))) / 2;
        }
        get("bed_contact").area_mm2 = contact;
        get("bed_contact").estimated = true;
        get("bed_contact").count = contact <= eps ** 2 ? 1 : 0;
        finish(
          "bed_contact",
          "Contact area after virtually lowering this model onto an XY bed. Adhesion/stability are not predicted; scene placement is unchanged.",
        );
        const threshold = profile.min_wall_mm ?? profile.line_width_mm;
        if (
          threshold != null &&
          settings.level === "detailed" &&
          report.volume_valid
        ) {
          stage = "Sampled wall thickness";
          let tested = 0,
            missed = 0,
            minimum = Infinity;
          const step = Math.max(1, Math.ceil(n / 2048));
          for (let i = 0; i < n; i += step) {
            tick();
            const t = triangleAt(positions, i),
              normal = cross(sub(t[1], t[0]), sub(t[2], t[0])),
              length = Math.hypot(...normal),
              direction = normal.map((v) => -v / length),
              point = [0, 1, 2].map((k) => (t[0][k] + t[1][k] + t[2][k]) / 3);
            const hits = rayQuery(
              tree,
              positions,
              point,
              direction,
              eps * 8,
              (id) => id !== i,
              tick,
            ).sort((a, b) => a.t - b.t);
            if (!hits.length || hits[0].edge) {
              missed++;
              continue;
            }
            tested++;
            minimum = Math.min(minimum, hits[0].t);
            if (hits[0].t < threshold) issue("thin_walls", i);
          }
          Object.assign(get("thin_walls"), {
            estimated: true,
            samples: tested,
            unresolved_samples: missed,
            minimum_sampled_mm: Number.isFinite(minimum) ? minimum : null,
          });
          mark(
            "thin_walls",
            get("thin_walls").count ? "issue" : "inconclusive",
            `${tested} face-centre samples; threshold ${threshold} mm. Sampling can miss thin features and does not prove a minimum wall thickness.`,
          );
        } else if (threshold != null)
          mark(
            "thin_walls",
            "inconclusive",
            "Requires Detailed check with valid closed volume and confirmed units.",
          );
      }
    }
  } catch (error) {
    if (error.message !== "PRINT_TIME_LIMIT") throw error;
    for (const c of checks)
      if (c.status === "not_run")
        c.message = `Time limit reached during ${stage}; this check was not completed.`;
    if (!topologyComplete)
      for (const c of checks.slice(0, 8)) {
        c.status = "inconclusive";
        c.message =
          "Topology check exceeded the time limit; counts are partial.";
      }
    report.limit_reason = "time";
  }
  const required = checks.slice(0, 11);
  report.summary = checks.some(
    (c) => c.status === "issue" && c.severity !== "info",
  )
    ? "issues_found"
    : required.some((c) => ["not_run", "inconclusive"].includes(c.status)) ||
        checks.some((c) => c.status === "inconclusive")
      ? "incomplete"
      : "no_issues_found";
  report.elapsed_ms = performance.now() - start;
  return report;
}
