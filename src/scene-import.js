import {
  validateBookmarks,
  validateSizeState,
  validateUnits,
} from "./model-tools.js";
import { validateView, validateSection } from "./appearance.js";
import { colorRGB } from "./geometry.js";
import {
  normalizeAnimation,
  normalizePlaybackState,
  createPlayback,
} from "./animation.js";

const axes = ["x", "y", "z"];
const numeric = (value, name, positive = false) => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (positive && value <= 0)
  )
    throw new Error(`Invalid scene ${name}`);
  return value;
};
export const sceneFormat = (name) =>
  String(name || "")
    .match(/\.(vsb|vsj)(?:[?#]|$)/i)?.[1]
    .toLowerCase() || "";
export const modelFormat = (name) =>
  /\.(stl|obj|3mf|step|stp|iges|igs)(?:[?#]|$)/i.test(name);
export function validateScene(input, limits) {
  if (
    !input ||
    !Array.isArray(input.models) ||
    !input.models.length ||
    input.models.length > limits.max_archive_entries
  )
    throw new Error("Invalid, empty or oversized scene manifest");
  const scene = { models: [] };
  if (input.camera_bookmarks !== undefined)
    scene.camera_bookmarks = validateBookmarks(input.camera_bookmarks);
  if (input.display_units !== undefined)
    scene.display_units = validateUnits(input.display_units);
  for (const key of ["center_models", "auto_rotate", "grid"]) {
    if (input[key] !== undefined) {
      if (typeof input[key] !== "boolean")
        throw new Error(`Invalid scene ${key}`);
      scene[key] = input[key];
    }
  }
  if (input.bg_color !== undefined) {
    if (input.bg_color !== "transparent") colorRGB(input.bg_color);
    scene.bg_color = input.bg_color;
  }
  if (input.infinite_grid)
    scene.infinite_grid = {
      spacing: numeric(input.infinite_grid.spacing, "grid spacing", true),
      height: numeric(input.infinite_grid.height, "grid height"),
    };
  if (input.camera_state) {
    const camera = {};
    for (const key of ["position", "target", "up"])
      camera[key] = Object.fromEntries(
        axes.map((a) => [a, numeric(input.camera_state[key]?.[a], "camera")]),
      );
    const d = axes.map((a) => camera.position[a] - camera.target[a]),
      u = axes.map((a) => camera.up[a]);
    if (
      !Math.hypot(...d) ||
      !Math.hypot(...u) ||
      !Math.hypot(
        d[1] * u[2] - d[2] * u[1],
        d[2] * u[0] - d[0] * u[2],
        d[0] * u[1] - d[1] * u[0],
      )
    )
      throw new Error("Invalid scene camera");
    scene.camera_state = camera;
  }
  for (const source of input.models) {
    if (
      !source ||
      typeof source.filename !== "string" ||
      !source.filename ||
      source.filename.length > 8192 ||
      /[\x00-\x1f\x7f]/.test(source.filename)
    )
      throw new Error("Scene model filename is missing or invalid");
    if (sceneFormat(source.filename))
      throw new Error("Nested scene references are not supported");
    const m = { filename: source.filename };
    if (typeof source.orig_filename === "string")
      m.orig_filename = source.orig_filename.slice(0, 200);
    for (const axis of axes)
      for (const prefix of ["", "rotation", "scale"]) {
        const key = prefix + axis;
        if (source[key] !== undefined)
          m[key] = numeric(source[key], key, prefix === "scale");
      }
    if (source.scale !== undefined)
      m.scale = numeric(source.scale, "scale", true);
    if (source.opacity !== undefined) {
      m.opacity = numeric(source.opacity, "opacity");
      if (m.opacity < 0 || m.opacity > 1)
        throw new Error("Invalid scene opacity");
    }
    if (source.color != null) {
      if (source.color !== "transparent") colorRGB(source.color);
      m.color = source.color;
    }
    m.units = source.units ?? "mm";
    if (!["mm", "inch"].includes(m.units))
      throw new Error("Invalid scene units");
    Object.assign(
      m,
      validateView(
        source.display ?? "flat",
        source.smooth_shading ?? source.display === "smooth",
      ),
    );
    m.section = validateSection(source.section);
    if (
      source.view_edges !== undefined &&
      typeof source.view_edges !== "boolean"
    )
      throw new Error("Invalid scene edges");
    m.view_edges = !!source.view_edges;
    if (source.animation != null)
      m.animation = normalizeAnimation(source.animation);
    if (source.animation_state != null) {
      if (!m.animation) throw new Error("Playback state needs an animation");
      m.animation_state = normalizePlaybackState(source.animation_state);
    }
    if (m.animation) createPlayback(m.animation, m, m.animation_state);
    if (source.size_state !== undefined)
      m.size_state = validateSizeState(source.size_state);
    if (source.display_name !== undefined) {
      if (
        typeof source.display_name !== "string" ||
        source.display_name.length > 1024
      )
        throw new Error("Invalid model name");
      m.display_name = source.display_name;
    }
    scene.models.push(m);
  }
  return scene;
}

// Match exact relative paths first; basename fallback must be unambiguous.
export function localSceneFile(reference, files) {
  let path;
  try {
    path = decodeURIComponent(reference.split(/[?#]/)[0]).replaceAll("\\", "/");
  } catch {
    throw new Error("Invalid scene filename encoding");
  }
  const candidates = [...new Set(files)];
  const exact = candidates.filter(
    (f) => (f.webkitRelativePath || f.name) === path,
  );
  if (exact.length === 1) return exact[0];
  const matching = candidates.filter((f) => f.name === path.split("/").pop());
  if (matching.length > 1 || exact.length > 1)
    throw new Error("More than one supplied file matches " + path);
  return matching[0] || null;
}
export function sceneURL(reference, base) {
  let url;
  try {
    url = base ? new URL(reference, base) : new URL(reference);
  } catch {
    return null;
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error(
      "Scene references must be HTTP/HTTPS URLs without login credentials",
    );
  url.hash = "";
  return url.href;
}
