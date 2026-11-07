export const DISPLAYS = [
  "flat",
  "smooth",
  "wireframe",
  "edges",
  "mesh",
  "xray",
  "studio",
  "orientation",
];

export function validateView(display, smooth) {
  if (!DISPLAYS.includes(display)) throw new Error("Invalid display mode");
  if (typeof smooth !== "boolean")
    throw new Error("smooth_shading must be a boolean");
  return { display, smooth_shading: display === "smooth" || smooth };
}

export function viewFeatures(view) {
  return {
    smooth:
      (view.smooth_shading || view.display === "smooth") &&
      view.display !== "wireframe",
    edges: view.view_edges || view.display === "edges",
    wire: view.display === "wireframe",
    edgeAngle: view.display === "edges" ? 30 : 1,
  };
}

export function validateSection(section) {
  if (section == null) return null;
  if (!["x", "y", "z"].includes(section.axis))
    throw new Error("Section axis must be x, y or z");
  if (
    !Number.isFinite(section.position) ||
    section.position < 0 ||
    section.position > 1
  )
    throw new Error("Section position must be between 0 and 1");
  if (section.flip !== undefined && typeof section.flip !== "boolean")
    throw new Error("Section flip must be a boolean");
  return {
    axis: section.axis,
    position: section.position,
    flip: section.flip ?? false,
  };
}

// Plane in source-model coordinates; moves and scales with that model.
export function sectionPlane(bounds, section) {
  if (!section) return [0, 0, 0, 0];
  const axis = ["x", "y", "z"].indexOf(section.axis),
    sign = section.flip ? -1 : 1;
  const plane = [0, 0, 0, 0];
  plane[axis] = sign;
  plane[3] =
    -sign *
    (bounds.min[axis] +
      (bounds.max[axis] - bounds.min[axis]) * section.position);
  return plane;
}
