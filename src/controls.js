import { add, sub, mul, norm, cross, rotateAxis } from "./math.js";
export class Controls {
  constructor(canvas, camera, invalidate, pick, type = 0) {
    this.enabled = true;
    this.noZoom = false;
    this.type = type;
    this.camera = camera;
    this.invalidate = invalidate;
    this.pointers = new Map();
    this.cleanups = [];
    this.canvas = canvas;
    const on = (name, fn, options) => {
      canvas.addEventListener(name, fn, options);
      this.cleanups.push(() => canvas.removeEventListener(name, fn, options));
    };
    on("pointerdown", (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        button: e.button,
      });
      pick(e, e.pointerType === "touch" ? 20 : e.button === 2 ? 3 : 1);
    });
    on("pointermove", (e) => {
      const previous = this.pointers.get(e.pointerId);
      if (!previous || !this.enabled) return;
      const next = { x: e.clientX, y: e.clientY, button: previous.button };
      if (this.pointers.size === 2) {
        const other = [...this.pointers.entries()].find(
          ([id]) => id !== e.pointerId,
        )[1];
        const oldDistance = Math.hypot(
            previous.x - other.x,
            previous.y - other.y,
          ),
          newDistance = Math.hypot(next.x - other.x, next.y - other.y);
        if (oldDistance > 0 && newDistance > 0)
          this.zoom(oldDistance / newDistance);
        this.pan((next.x - previous.x) / 2, (next.y - previous.y) / 2);
      } else if (previous.button === 2 || e.shiftKey || previous.button === 1)
        this.pan(next.x - previous.x, next.y - previous.y);
      else
        this.orbit(
          ((next.x - previous.x) / Math.max(1, canvas.clientHeight)) * Math.PI,
          ((next.y - previous.y) / Math.max(1, canvas.clientHeight)) * Math.PI,
        );
      this.pointers.set(e.pointerId, next);
    });
    const release = (e) => {
      this.pointers.delete(e.pointerId);
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
    };
    on("pointerup", release);
    on("pointercancel", release);
    on("lostpointercapture", (e) => this.pointers.delete(e.pointerId));
    on(
      "wheel",
      (e) => {
        if (!this.enabled || this.noZoom) return;
        e.preventDefault();
        const delta =
          e.deltaY *
          (e.deltaMode === 1
            ? 16
            : e.deltaMode === 2
              ? canvas.clientHeight
              : 1);
        this.zoom(Math.exp(Math.max(-1, Math.min(1, delta * 0.001))));
      },
      { passive: false },
    );
    on("dblclick", (e) => {
      if (this.enabled) pick(e, 11);
    });
    on("contextmenu", (e) => e.preventDefault());
  }
  orbit(dx, dy) {
    const c = this.camera;
    let offset = sub(c.position, c.target),
      up = norm(c.up);
    offset = rotateAxis(offset, up, -dx);
    const right = norm(cross(up, offset));
    const rotated = rotateAxis(offset, right, -dy);
    if (this.type === 1) {
      offset = rotated;
      c.up = norm(rotateAxis(up, right, -dy));
    } else {
      const d = norm(rotated),
        alignment = d.reduce((v, x, i) => v + x * up[i], 0);
      if (Math.abs(alignment) < 0.9995) offset = rotated;
    }
    c.position = add(c.target, offset);
    this.invalidate();
  }
  zoom(factor) {
    if (this.noZoom) return;
    const c = this.camera,
      offset = sub(c.position, c.target),
      distance = Math.hypot(...offset);
    const next = Math.max(1e-6, Math.min(1e15, distance * factor));
    c.position = add(c.target, mul(offset, next / (distance || 1)));
    this.invalidate();
  }
  pan(dx, dy) {
    const c = this.camera,
      offset = sub(c.position, c.target),
      right = norm(cross(c.up, offset)),
      up = norm(cross(offset, right));
    const scale =
      (2 * Math.hypot(...offset) * Math.tan(Math.PI / 8)) /
      Math.max(1, this.canvas.clientHeight);
    const delta = add(mul(right, -dx * scale), mul(up, dy * scale));
    c.target = add(c.target, delta);
    c.position = add(c.position, delta);
    this.invalidate();
  }
  dispose() {
    for (const cleanup of this.cleanups) cleanup();
    this.pointers.clear();
  }
}
