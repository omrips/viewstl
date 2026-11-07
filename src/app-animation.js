import { enginePosition, rotationMatrix } from "./model-transform.js";

export const animationControls = [
  "animation-details",
  "animation-fields",
  "animation-axis",
  "animation-seconds",
  "animation-direction",
  "animation-play",
  "animation-pause",
  "animation-stop",
  "animation-status",
  "animation-error",
];
const axes = ["x", "y", "z"];

// Constant-size metadata only: no mesh scans, copies or statistics calculation.
export function syncAnimatedRecord(record, model) {
  if (!record || !model?.geometry) return;
  record.bounds = Object.fromEntries(
    ["min", "max"].map((key) => [
      key,
      model.geometry.bounds[key].map(
        (v, i) => (v - model.center[i]) * model.scaleVector[i],
      ),
    ]),
  );
  record.rotation = Object.fromEntries(
    axes.map((a) => [a, ((model["rotation" + a] * 180) / Math.PI) % 360]),
  );
  record.position = { x: 0, y: 0, z: 0 };
  const offset = enginePosition(record);
  for (const a of axes) record.position[a] = model[a] - offset[a];
}

// Move the pivot to the mesh center without moving any rendered vertex.
export function centerAnimationPivot(record, model) {
  syncAnimatedRecord(record, model);
  const center = model.geometry.bounds.min.map(
    (v, i) => (v + model.geometry.bounds.max[i]) / 2,
  );
  const delta = center.map(
    (v, i) => (v - model.center[i]) * model.scaleVector[i],
  );
  const rotation = rotationMatrix(record.rotation);
  const original = record.originalPosition || { x: 0, y: 0, z: 0 };
  record.originalPosition = Object.fromEntries(
    axes.map((a, i) => [a, original[a] + delta[i]]),
  );
  for (let i = 0; i < 3; i++)
    model[axes[i]] += delta.reduce(
      (sum, v, j) => sum + rotation[i * 3 + j] * v,
      0,
    );
  model.center = center;
  record.animationPivot = true;
  syncAnimatedRecord(record, model);
}

export function spinDefinition(axis, seconds, direction) {
  if (
    !axes.includes(axis) ||
    !Number.isFinite(seconds) ||
    seconds < 0.1 ||
    seconds > 3600 ||
    !["1", "-1"].includes(direction)
  )
    throw new Error("Choose an axis and a duration from 0.1 to 3,600 seconds.");
  return {
    delta: {
      ["rotation" + axis]: 2 * Math.PI * Number(direction),
      msec: seconds * 1000,
      loop: true,
    },
  };
}

export function bindAppAnimation({
  $,
  listen,
  window,
  getState,
  getViewer,
  beforePlay,
  refreshPose,
  announce,
}) {
  const settings = new Map();
  let selected = null,
    timer = null,
    disposed = false;
  const state = () => {
    const s = getState();
    return {
      ...s,
      playback:
        s.selectedId == null
          ? null
          : getViewer()?.get_model_animation_state(s.selectedId),
    };
  };
  function sync() {
    if (disposed) return;
    const s = state(),
      available = s.models.some((m) => m.id === s.selectedId);
    for (const id of settings.keys())
      if (!s.models.some((m) => m.id === id)) settings.delete(id);
    $("animation-details").hidden = !available;
    $("animation-fields").disabled = s.busy || !available;
    if (selected !== s.selectedId) {
      selected = s.selectedId;
      let value = settings.get(selected);
      if (!value) {
        value = { axis: "z", seconds: 5, direction: "1" };
        const a = getViewer()?._models.get(selected)?.animation;
        const entries = Object.entries(a?.delta || {}).filter(
          ([k, v]) => k.startsWith("rotation") && v !== 0,
        );
        if (a?.delta?.loop && !a.exact && entries.length === 1) {
          value = {
            axis: entries[0][0].slice(-1),
            seconds:
              (a.delta.msec * 2 * Math.PI) / Math.abs(entries[0][1]) / 1000,
            direction: entries[0][1] < 0 ? "-1" : "1",
          };
        }
        settings.set(selected, value);
      }
      $("animation-axis").value = value.axis;
      $("animation-seconds").value = value.seconds;
      $("animation-direction").value = value.direction;
      $("animation-error").hidden = true;
    }
    const status = s.playback?.status || "idle",
      active = ["running", "paused"].includes(status);
    $("animation-play").textContent = active ? "Restart spin" : "Play";
    $("animation-pause").textContent = status === "paused" ? "Resume" : "Pause";
    $("animation-pause").disabled = !active;
    $("animation-stop").disabled = !active;
    const label = {
      idle: "Ready",
      running: "Playing",
      paused: "Paused",
      stopped: "Stopped",
      completed: "Finished",
    }[status];
    const text = `${label}. ${active ? "Stop keeps the current pose." : "Spin the selected model around its center."}`;
    if ($("animation-status").textContent !== text)
      $("animation-status").textContent = text;
    if (status === "running" && !timer)
      timer = window.setInterval(() => {
        if (!disposed && !window.document.hidden) refreshPose();
      }, 250);
    if (status !== "running" && timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }
  function play(keepPaused = false) {
    const s = state();
    if (s.busy || s.selectedId == null) return;
    try {
      const value = {
        axis: $("animation-axis").value,
        seconds: $("animation-seconds").valueAsNumber,
        direction: $("animation-direction").value,
      };
      const definition = spinDefinition(
        value.axis,
        value.seconds,
        value.direction,
      );
      beforePlay(s.selectedId);
      getViewer().animate_model(s.selectedId, definition);
      if (keepPaused && s.playback?.status === "paused")
        getViewer().pause_model_animation(s.selectedId);
      settings.set(s.selectedId, value);
      $("animation-error").hidden = true;
      announce(
        keepPaused && s.playback?.status === "paused"
          ? "Spin updated. Still paused."
          : "Animation playing.",
      );
      sync();
    } catch (error) {
      $("animation-error").textContent = error.message;
      $("animation-error").hidden = false;
    }
  }
  listen($("animation-play"), "click", () => play());
  listen($("animation-pause"), "click", () => {
    const s = state();
    if (s.busy || s.selectedId == null) return;
    getViewer()[
      s.playback?.status === "paused"
        ? "resume_model_animation"
        : "pause_model_animation"
    ](s.selectedId);
    sync();
  });
  listen($("animation-stop"), "click", () => {
    const s = state();
    if (!s.busy && s.selectedId != null)
      getViewer().animate_model(s.selectedId, null);
    sync();
  });
  for (const id of [
    "animation-axis",
    "animation-seconds",
    "animation-direction",
  ])
    listen($(id), "change", () => {
      if (["running", "paused"].includes(state().playback?.status)) play(true);
      else
        settings.set(selected, {
          axis: $("animation-axis").value,
          seconds: $("animation-seconds").valueAsNumber,
          direction: $("animation-direction").value,
        });
    });
  sync();
  return {
    sync,
    dispose() {
      disposed = true;
      window.clearInterval(timer);
      settings.clear();
    },
  };
}
