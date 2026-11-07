// Pure transform animation shared by the viewer and scene-manifest validation.
// Geometry/GPU resources never belong to the playback state.
export const animationKeys = [
  "x",
  "y",
  "z",
  "rotationx",
  "rotationy",
  "rotationz",
  "scalex",
  "scaley",
  "scalez",
];
const isScale = (key) => key.startsWith("scale");
const number = (value, name, positive = false) => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    Math.abs(value) > Number.MAX_SAFE_INTEGER ||
    (positive && value <= 0)
  )
    throw new Error(`Invalid animation ${name}`);
  return value;
};
const object = (value, name) => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`Invalid animation ${name}`);
  return value;
};
export function animationPose(model) {
  return Object.fromEntries(
    animationKeys.map((key) => [
      key,
      number(
        model[key] ?? (isScale(key) ? (model.scale ?? 1) : 0),
        key,
        isScale(key),
      ),
    ]),
  );
}
export function normalizeAnimation(input) {
  object(input, "definition");
  const result = {},
    claimed = new Set();
  for (const mode of ["delta", "exact"]) {
    if (input[mode] == null) continue;
    const source = object(input[mode], mode),
      values = {};
    const msec = number(source.msec ?? 300, "duration", true);
    if (source.loop !== undefined && typeof source.loop !== "boolean")
      throw new Error("Animation loop must be a boolean");
    const loop = mode === "delta" && !!source.loop;
    for (const key of animationKeys) {
      const value = source[key] ?? (isScale(key) ? source.scale : undefined);
      if (value === undefined) continue;
      if (claimed.has(key))
        throw new Error(`Animation delta/exact conflict: ${key}`);
      number(value, key, mode === "exact" && isScale(key));
      if (loop && isScale(key) && value < 0)
        throw new Error("Looping scale deltas cannot be negative");
      values[key] = value;
      claimed.add(key);
    }
    if (!Object.keys(values).length)
      throw new Error("Animation track needs a transform");
    result[mode] = { ...values, msec, ...(loop ? { loop: true } : {}) };
  }
  if (!Object.keys(result).length)
    throw new Error("Animation needs delta or exact");
  return result;
}
export function normalizePlaybackState(input) {
  object(input, "playback state");
  if (input.version !== 1 || typeof input.paused !== "boolean")
    throw new Error("Invalid animation playback state version or paused flag");
  const elapsed_ms = number(input.elapsed_ms, "elapsed time");
  if (elapsed_ms < 0) throw new Error("Invalid animation elapsed time");
  object(input.origin, "origin");
  // Serialized origins must be complete, never guessed from a current pose.
  for (const key of animationKeys) number(input.origin[key], key, isScale(key));
  if (!Array.isArray(input.center) || input.center.length !== 3)
    throw new Error("Invalid animation pivot");
  return {
    version: 1,
    elapsed_ms,
    paused: input.paused,
    origin: animationPose(input.origin),
    center: input.center.map((v) => number(v, "pivot")),
  };
}
export function createPlayback(definition, model, saved) {
  const animation = normalizeAnimation(definition);
  const state = saved == null ? null : normalizePlaybackState(saved);
  const origin = state?.origin ?? animationPose(model);
  const tracks = Object.entries(animation).map(([mode, a]) => {
    const values = Object.entries(a).filter(([key]) =>
      animationKeys.includes(key),
    );
    if (mode === "delta")
      for (const [key, value] of values)
        number(origin[key] + value, `${key} endpoint`, isScale(key));
    return { mode, values, duration: a.msec, loop: !!a.loop, done: false };
  });
  const playback = {
    animation,
    origin,
    tracks,
    elapsed_ms: state?.elapsed_ms ?? 0,
    paused: state?.paused ?? false,
    last_time: null,
  };
  // Validate the restored pose as well as the first endpoint before committing.
  evaluatePlayback({ ...playback, tracks: tracks.map((t) => ({ ...t })) }, {});
  return playback;
}
export function evaluatePlayback(playback, model) {
  const updates = [];
  for (const track of playback.tracks) {
    if (track.done) continue;
    const fraction = playback.elapsed_ms / track.duration;
    const p = track.loop ? fraction : Math.min(fraction, 1);
    for (const [key, value] of track.values) {
      const from = playback.origin[key];
      const to =
        track.mode === "delta" ? from + value * p : from * (1 - p) + value * p;
      updates.push([key, number(to, `${key} result`, isScale(key))]);
    }
  }
  let scaleChanged = false;
  for (const [key, value] of updates) {
    scaleChanged ||= isScale(key) && model[key] !== value;
    model[key] = value;
  }
  for (const track of playback.tracks)
    if (!track.loop && playback.elapsed_ms >= track.duration) track.done = true;
  if (scaleChanged) model._stats = null;
  return playback.tracks.some((track) => !track.done);
}
export function advancePlayback(playback, model, time) {
  if (playback.paused) return true;
  if (playback.last_time !== null)
    playback.elapsed_ms = number(
      playback.elapsed_ms + Math.max(0, time - playback.last_time),
      "elapsed time",
    );
  playback.last_time = time;
  return evaluatePlayback(playback, model);
}
export function playbackState(playback, suspended = false) {
  return {
    status: playback.paused ? "paused" : "running",
    elapsed_ms: playback.elapsed_ms,
    suspended,
    tracks: playback.tracks
      .filter((t) => !t.done)
      .map((t) => ({
        mode: t.mode,
        msec: t.duration,
        loop: t.loop,
        progress: t.loop
          ? (playback.elapsed_ms % t.duration) / t.duration
          : Math.min(1, playback.elapsed_ms / t.duration),
      })),
  };
}
export function savePlayback(model) {
  const p = model._animation;
  if (!p) return null;
  const factor = model.unitScale ?? 1;
  const animation = structuredClone(p.animation),
    origin = { ...p.origin };
  for (const key of animationKeys.filter(isScale)) {
    origin[key] *= factor;
    for (const track of Object.values(animation))
      if (track[key] !== undefined) track[key] *= factor;
  }
  const animation_state = normalizePlaybackState({
    version: 1,
    origin,
    elapsed_ms: p.elapsed_ms,
    paused: p.paused,
    center: [...model.center],
  });
  return { animation: normalizeAnimation(animation), animation_state };
}
