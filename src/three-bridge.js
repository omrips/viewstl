import { finishGeometry } from "./geometry.js";
export function fromThreeMesh(mesh, limits) {
  if (!mesh?.isMesh && !mesh?.geometry)
    throw new Error("Expected a Three.js mesh");
  if (
    mesh.isSkinnedMesh ||
    mesh.isInstancedMesh ||
    mesh.children?.length ||
    mesh.morphTargetInfluences?.some(Boolean)
  )
    throw new Error("Only a static standalone Three.js mesh is supported");
  const material = mesh.material;
  if (Array.isArray(material) || material?.isShaderMaterial || material?.map)
    throw new Error(
      "Multiple, textured or shader materials need an application adapter",
    );
  const g = mesh.geometry;
  let positions,
    colors = null;
  if (g?.attributes?.position) {
    const p = g.attributes.position,
      indices = g.index,
      n = indices?.count ?? p.count;
    if (n % 3 || n / 3 > limits.max_triangles)
      throw new Error("Invalid or oversized mesh");
    positions = new Float32Array(n * 3);
    if (g.attributes.color) colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const j = indices ? indices.getX(i) : i;
      for (const [k, method] of ["getX", "getY", "getZ"].entries()) {
        positions[i * 3 + k] = p[method](j);
        if (colors) colors[i * 3 + k] = g.attributes.color[method](j);
      }
    }
  } else if (g?.vertices && g?.faces) {
    if (g.faces.length > limits.max_triangles)
      throw new Error("Triangle limit exceeded");
    positions = new Float32Array(g.faces.length * 9);
    if (material?.vertexColors) colors = new Float32Array(positions.length);
    g.faces.forEach((f, i) => {
      for (const [k, index] of [f.a, f.b, f.c].entries()) {
        const v = g.vertices[index];
        if (!v) throw new Error("Invalid mesh index");
        positions.set([v.x, v.y, v.z], i * 9 + k * 3);
        if (colors)
          colors.set([f.color.r, f.color.g, f.color.b], i * 9 + k * 3);
      }
    });
  } else throw new Error("Unsupported Three.js geometry");
  return finishGeometry(positions, colors, limits);
}
export function toThreeMesh(model, THREE) {
  if (!THREE?.Mesh || !THREE?.BufferGeometry || !THREE?.BufferAttribute)
    throw new Error(
      "get_model_mesh requires options.three or globalThis.THREE; use get_model_data for native geometry",
    );
  const g = model.geometry,
    geometry = new THREE.BufferGeometry(),
    p = g.positions.slice(),
    s = model.scaleVector,
    c = model.center;
  for (let i = 0; i < p.length; i++) p[i] = (p[i] - c[i % 3]) * s[i % 3];
  const attribute = (name, array) => {
    const attr = new THREE.BufferAttribute(array, 3);
    if (geometry.setAttribute) geometry.setAttribute(name, attr);
    else geometry.addAttribute(name, attr);
  };
  attribute("position", p);
  if (g.colors && !model.color) attribute("color", g.colors.slice());
  geometry.computeVertexNormals();
  const material = new THREE.MeshLambertMaterial({
    color:
      model.color === "transparent"
        ? "#909090"
        : model.color || (g.colors ? "#ffffff" : "#909090"),
    vertexColors:
      g.colors && !model.color ? (THREE.VertexColors ?? true) : false,
    side: THREE.DoubleSide,
    transparent: model.opacity < 1 || model.color === "transparent",
    opacity: model.color === "transparent" ? 0 : model.opacity,
    wireframe: model.display === "wireframe",
    flatShading: model.display !== "smooth",
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(model.x, model.y, model.z);
  mesh.rotation.set(model.rotationx, model.rotationy, model.rotationz);
  return mesh;
}
