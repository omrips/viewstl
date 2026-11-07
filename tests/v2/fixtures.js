export function cubePositions() {
  const vertices = [
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1],
    ],
    faces = [
      [0, 2, 1],
      [0, 3, 2],
      [4, 5, 6],
      [4, 6, 7],
      [0, 1, 5],
      [0, 5, 4],
      [3, 7, 6],
      [3, 6, 2],
      [0, 4, 7],
      [0, 7, 3],
      [1, 2, 6],
      [1, 6, 5],
    ];
  return new Float32Array(faces.flatMap((f) => f.flatMap((i) => vertices[i])));
}
export function binary(
  points = [0, 0, 0, 1, 0, 0, 0, 1, 0],
  header = "solid binary header",
  attributes = 0,
) {
  const b = new ArrayBuffer(84 + (points.length / 9) * 50),
    d = new DataView(b);
  new Uint8Array(b).set(new TextEncoder().encode(header).subarray(0, 80));
  d.setUint32(80, points.length / 9, true);
  for (let t = 0; t < points.length / 9; t++) {
    for (let k = 0; k < 9; k++)
      d.setFloat32(96 + t * 50 + k * 4, points[t * 9 + k], true);
    d.setUint16(132 + t * 50, attributes, true);
  }
  return b;
}
export function torusPositions(major = 96, minor = 32) {
  const p = new Float32Array(major * minor * 18);
  let i = 0;
  const point = (u, v) => {
    const a = (u / major) * Math.PI * 2,
      b = (v / minor) * Math.PI * 2,
      r = 23 + 8 * Math.cos(b);
    return [r * Math.cos(a), r * Math.sin(a), 8 * Math.sin(b)];
  };
  for (let u = 0; u < major; u++)
    for (let v = 0; v < minor; v++)
      for (const [a, b] of [
        [u, v],
        [u + 1, v],
        [u + 1, v + 1],
        [u, v],
        [u + 1, v + 1],
        [u, v + 1],
      ]) {
        p.set(point(a, b), i);
        i += 3;
      }
  return p;
}
export const modelXML = `<?xml version="1.0"?><model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" unit="millimeter"><resources><basematerials id="10"><base name="red" displaycolor="#FF0000"/></basematerials><object id="1" pid="10" pindex="0"><mesh><vertices><vertex x="0" y="0" z="0"/><vertex x="1" y="0" z="0"/><vertex x="0" y="1" z="0"/></vertices><triangles><triangle v1="0" v2="1" v3="2"/></triangles></mesh></object><object id="2"><components><component objectid="1" transform="1 0 0 0 1 0 0 0 1 2 0 0"/></components></object></resources><build><item objectid="2" transform="1 0 0 0 1 0 0 0 1 0 3 0"/></build></model>`;
