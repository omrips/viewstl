// Mesh-only CAD writers. No analytic surfaces, feature history or closed-solid claim.
import { TextOutput, number, triangle } from "./export-utils.js";
import { sub, norm } from "./math.js";

const stepReal = (n) => {
  const s = number(n).toUpperCase();
  const [mantissa, exponent] = s.split("E");
  return (
    (mantissa.includes(".") ? mantissa : mantissa + ".") +
    (exponent === undefined ? "" : "E" + exponent)
  );
};
const stepString = (s) =>
  "'" +
  String(s)
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .replace(/['\\\u0080-\uffff]/g, (c) =>
      c === "'"
        ? "''"
        : c === "\\"
          ? "\\\\"
          : "\\X2\\" +
            c.charCodeAt(0).toString(16).padStart(4, "0").toUpperCase() +
            "\\X0\\",
    ) +
  "'";

export function writeSTEP(models, options, budget, tick) {
  const out = new TextOutput(budget);
  out.write(
    "ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ViewSTL mesh surfaces'),'2;1');\n",
  );
  out.write(
    `FILE_NAME('scene.step','${new Date().toISOString().slice(0, 19)}',(''),(''),'ViewSTL','ViewSTL','');\nFILE_SCHEMA(('AUTOMOTIVE_DESIGN'));\nENDSEC;\nDATA;\n`,
  );
  let next = 0;
  const entity = (value) => {
    const id = ++next;
    out.write(`#${id}=${value};\n`);
    return `#${id}`;
  };
  const point = (p) =>
    entity(`CARTESIAN_POINT('',(${p.map(stepReal).join(",")}))`);
  const direction = (p) =>
    entity(`DIRECTION('',(${p.map(stepReal).join(",")}))`);
  const app = entity("APPLICATION_CONTEXT('automotive design')");
  entity(
    `APPLICATION_PROTOCOL_DEFINITION('international standard','automotive_design',2000,${app})`,
  );
  const productContext = entity(`PRODUCT_CONTEXT('',${app},'mechanical')`);
  const definitionContext = entity(
    `PRODUCT_DEFINITION_CONTEXT('part definition',${app},'design')`,
  );
  const mm = entity("(LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.))");
  let length = mm;
  if (options.units === "inch") {
    const dimensions = entity("DIMENSIONAL_EXPONENTS(1.,0.,0.,0.,0.,0.,0.)");
    const factor = entity(
      `LENGTH_MEASURE_WITH_UNIT(LENGTH_MEASURE(25.4),${mm})`,
    );
    length = entity(
      `(CONVERSION_BASED_UNIT('INCH',${factor})LENGTH_UNIT()NAMED_UNIT(${dimensions}))`,
    );
  }
  const angle = entity("(NAMED_UNIT(*)PLANE_ANGLE_UNIT()SI_UNIT($,.RADIAN.))");
  const solidAngle = entity(
    "(NAMED_UNIT(*)SI_UNIT($,.STERADIAN.)SOLID_ANGLE_UNIT())",
  );
  const uncertainty = entity(
    `UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-7),${length},'distance_accuracy_value','')`,
  );
  const context = entity(
    `(GEOMETRIC_REPRESENTATION_CONTEXT(3)GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((${uncertainty}))GLOBAL_UNIT_ASSIGNED_CONTEXT((${length},${angle},${solidAngle}))REPRESENTATION_CONTEXT('',''))`,
  );
  for (const model of models) {
    const product = entity(
      `PRODUCT(${stepString(model.id)},${stepString(model.name)},'',(${productContext}))`,
    );
    const formation = entity(`PRODUCT_DEFINITION_FORMATION('','',${product})`);
    const definition = entity(
      `PRODUCT_DEFINITION('design','',${formation},${definitionContext})`,
    );
    const definitionShape = entity(
      `PRODUCT_DEFINITION_SHAPE('','',${definition})`,
    );
    const shells = [];
    for (let i = 0; i < model.positions.length; i += 9) {
      const { vertices: v, normal, degenerate } = triangle(model, i);
      if (degenerate)
        throw new Error("STEP export requires non-degenerate triangles");
      const pts = v.map(point),
        verts = pts.map((p) => entity(`VERTEX_POINT('',${p})`));
      const edges = [];
      for (let k = 0; k < 3; k++) {
        const d = direction(norm(sub(v[(k + 1) % 3], v[k])));
        const vector = entity(`VECTOR('',${d},1.)`);
        const line = entity(`LINE('',${pts[k]},${vector})`);
        const edge = entity(
          `EDGE_CURVE('',${verts[k]},${verts[(k + 1) % 3]},${line},.T.)`,
        );
        edges.push(entity(`ORIENTED_EDGE('',*,*,${edge},.T.)`));
      }
      const loop = entity(`EDGE_LOOP('',(${edges.join(",")}))`);
      const bound = entity(`FACE_OUTER_BOUND('',${loop},.T.)`);
      const z = direction(normal),
        x = direction(norm(sub(v[1], v[0])));
      const placement = entity(`AXIS2_PLACEMENT_3D('',${pts[0]},${z},${x})`);
      const plane = entity(`PLANE('',${placement})`);
      const face = entity(`ADVANCED_FACE('',(${bound}),${plane},.T.)`);
      // A separate open shell per triangle is valid for both open and disconnected meshes.
      shells.push(entity(`OPEN_SHELL('',(${face}))`));
      tick();
    }
    // Stream the aggregate too: a million references must not become one huge string.
    const surface = `#${++next}`;
    out.write(`${surface}=SHELL_BASED_SURFACE_MODEL('',(`);
    shells.forEach((s, i) => out.write((i ? "," : "") + s));
    out.write("));\n");
    const representation = entity(
      `MANIFOLD_SURFACE_SHAPE_REPRESENTATION('',(${surface}),${context})`,
    );
    entity(
      `SHAPE_DEFINITION_REPRESENTATION(${definitionShape},${representation})`,
    );
  }
  out.write("ENDSEC;\nEND-ISO-10303-21;\n");
  return new Blob(out.finish(), { type: "model/step" });
}

export function writeIGES(models, options, budget, tick) {
  const directory = new TextOutput(budget),
    parameters = new TextOutput(budget),
    header = new TextOutput(budget);
  let dcount = 0,
    pcount = 0;
  const field = (v, width = 8) => {
    const s = String(v);
    if (s.length > width) throw new Error("IGES record limit exceeded");
    return s.padStart(width, " ");
  };
  const record = (text, section, index) =>
    text.padEnd(72, " ") + section + field(index, 7) + "\n";
  // IGES padding is whitespace: splitting a numeric token across records can truncate it.
  const pack = (fields, width) => {
    const lines = [];
    let line = "";
    fields.forEach((value, i) => {
      const token = value + (i === fields.length - 1 ? ";" : ",");
      if (token.length > width)
        throw new Error("IGES parameter exceeds record width");
      if (line.length + token.length > width) {
        lines.push(line);
        line = "";
      }
      line += token;
    });
    if (line) lines.push(line);
    return lines;
  };
  const add = (type, form, data, subordinate = false, level = 0) => {
    const id = dcount + 1,
      start = pcount + 1;
    for (const line of pack([type, ...data.split(",")], 64))
      parameters.write(record(line.padEnd(64, " ") + field(id), "P", ++pcount));
    directory.write(
      record(
        [
          type,
          start,
          0,
          0,
          level,
          0,
          0,
          0,
          subordinate ? "00010000" : "00000000",
        ]
          .map((v) => field(v))
          .join(""),
        "D",
        ++dcount,
      ),
    );
    directory.write(
      record(
        [type, 0, 0, pcount - start + 1, form, 0, 0, "", 0]
          .map((v) => field(v))
          .join(""),
        "D",
        ++dcount,
      ),
    );
    return id;
  };
  let maximum = 1;
  for (let m = 0; m < models.length; m++) {
    const model = models[m];
    for (let i = 0; i < model.positions.length; i += 9) {
      const { vertices: v, normal: n, degenerate } = triangle(model, i);
      if (degenerate)
        throw new Error("IGES export requires non-degenerate triangles");
      for (const p of v)
        for (const c of p) maximum = Math.max(maximum, Math.abs(c));
      // Type 106, form 12: a 3D polyline, closed by repeating the first point.
      const curve = add(
        106,
        12,
        "2,4," + [...v, v[0]].flat().map(number).join(","),
        true,
        m + 1,
      );
      // Type 108, form 1: plane bounded by the referenced curve; Ax+By+Cz=D.
      const distance = n.reduce((sum, c, k) => sum + c * v[0][k], 0);
      add(
        108,
        1,
        [...n, distance, curve, 0, 0, 0, 0].map(number).join(","),
        false,
        m + 1,
      );
      tick();
    }
  }
  const date = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", ".")
    .slice(0, 15);
  const h = (s) => `${s.length}H${s}`;
  const global = [
    "1H,",
    "1H;",
    h("ViewSTL"),
    h("scene.iges"),
    h("ViewSTL"),
    h("ViewSTL"),
    32,
    38,
    6,
    308,
    15,
    h("ViewSTL"),
    1,
    options.units === "inch" ? 1 : 2,
    h(options.units === "inch" ? "IN" : "MM"),
    1,
    0.1,
    h(date),
    1e-7,
    number(maximum),
    "",
    "",
    11,
    0,
    h(date),
  ];
  header.write(record("ViewSTL mesh surfaces", "S", 1));
  let gcount = 0;
  for (const line of pack(global, 72))
    header.write(record(line, "G", ++gcount));
  const end = new TextOutput(budget);
  end.write(
    record(
      "S" +
        field(1, 7) +
        "G" +
        field(gcount, 7) +
        "D" +
        field(dcount, 7) +
        "P" +
        field(pcount, 7),
      "T",
      1,
    ),
  );
  return new Blob(
    [
      ...header.finish(),
      ...directory.finish(),
      ...parameters.finish(),
      ...end.finish(),
    ],
    { type: "model/iges" },
  );
}
