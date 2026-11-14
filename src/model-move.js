import { rotatedModel, depthPosition } from "./model-transform.js";
const vector = (p) => [p.x, p.y, p.z];
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((n, v, i) => n + v * b[i], 0);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a) => {
  const size = Math.hypot(...a);
  return a.map((v) => v / (size || 1));
};

// A translation parallel to the screen at the selected model's depth.
// Uses the viewer's 45-degree vertical field of view; no mesh reads or copies.
export function moveBasis(camera, center, viewportHeight) {
  const eye = vector(camera.position),
    target = vector(camera.target);
  const back = norm(sub(eye, target));
  let right = norm(cross(vector(camera.up), back));
  if (Math.hypot(...right) < 0.5)
    right = norm(cross(Math.abs(back[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], back));
  const up = cross(back, right),
    depth = dot(sub(eye, vector(center)), back);
  const scale =
    (2 * Math.max(depth, 1e-6) * Math.tan(Math.PI / 8)) /
    Math.max(viewportHeight, 1);
  return { right, up, scale };
}
export function movedPosition(start, basis, dx, dy) {
  return Object.fromEntries(
    ["x", "y", "z"].map((axis, i) => [
      axis,
      start[axis] + (basis.right[i] * dx - basis.up[i] * dy) * basis.scale,
    ]),
  );
}

export function bindModelMove(
  canvas,
  {
    getModel,
    getCamera,
    getTool = () => "move",
    onMove,
    onRotate,
    onStart,
    onEnd,
  },
) {
  let enabled = false,
    drag = null;
  const blocked = new Set(),
    cleanup = [];
  const on = (event, handler) => {
    canvas.addEventListener(event, handler, { capture: true, passive: false });
    cleanup.push(() => canvas.removeEventListener(event, handler, true));
  };
  const stop = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  const end = (cancel = false) => {
    if (!drag) return;
    const current = drag;
    drag = null;
    if (cancel) {
      if (current.tool === "rotate") onRotate?.(current.id, current.rotation);
      else onMove(current.id, current.position);
    }
    if (canvas.hasPointerCapture(current.pointer))
      canvas.releasePointerCapture(current.pointer);
    onEnd?.(current.id, cancel);
  };
  on("pointerdown", (e) => {
    if (!enabled || e.button !== 0 || e.shiftKey) return;
    stop(e);
    // A second touch cannot start an orbit while the first touch moves a model.
    if (drag || e.isPrimary === false) {
      blocked.add(e.pointerId);
      return;
    }
    const model = getModel(e);
    if (!model) return;
    drag = {
      tool: getTool(),
      rotation: { ...(model.rotation || { x: 0, y: 0, z: 0 }) },
      model: {
        ...model,
        position: { ...model.position },
        center: { ...model.center },
      },
      camera: getCamera(),
      height: canvas.getBoundingClientRect().height,
      id: model.id,
      position: { ...model.position },
      pointer: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      basis: moveBasis(
        getCamera(),
        model.center,
        canvas.getBoundingClientRect().height,
      ),
    };
    onStart?.(model.id);
    canvas.setPointerCapture(e.pointerId);
    canvas.focus({ preventScroll: true });
  });
  on("pointermove", (e) => {
    if (blocked.has(e.pointerId)) {
      stop(e);
      return;
    }
    if (!drag || drag.pointer !== e.pointerId) return;
    stop(e);
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    if (drag.tool === "rotate")
      onRotate?.(
        drag.id,
        rotatedModel(drag.rotation, drag.basis, dx, dy, drag.height),
      );
    else if (drag.tool === "depth")
      onMove(
        drag.id,
        depthPosition(
          drag.model,
          drag.camera,
          (dy * 3) / Math.max(1, drag.height),
        ),
      );
    else onMove(drag.id, movedPosition(drag.position, drag.basis, dx, dy));
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    on(event, (e) => {
      if (blocked.delete(e.pointerId)) {
        stop(e);
        return;
      }
      if (!drag || drag.pointer !== e.pointerId) return;
      stop(e);
      end(event !== "pointerup");
    });
  // In a model tool, wheel input changes this model's depth, never the camera zoom.
  on("wheel", (e) => {
    if (!enabled) return;
    stop(e);
    if (drag) return;
    const model = getModel();
    if (!model) return;
    const delta =
      e.deltaY *
      (e.deltaMode === 1
        ? 16
        : e.deltaMode === 2
          ? canvas.getBoundingClientRect().height
          : 1);
    onMove(
      model.id,
      depthPosition(
        model,
        getCamera(),
        Math.max(-0.5, Math.min(0.5, delta * 0.0015)),
      ),
    );
  });
  for (const event of ["keydown", "dblclick"])
    on(event, (e) => {
      if (drag && e.key !== "Escape") stop(e);
    });
  return {
    setEnabled(value) {
      end(true);
      blocked.clear();
      enabled = value;
    },
    dispose() {
      end(true);
      cleanup.forEach((fn) => fn());
    },
  };
}
