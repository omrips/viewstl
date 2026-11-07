import { test } from "node:test";
import assert from "node:assert/strict";
import {
  moveBasis,
  movedPosition,
  bindModelMove,
} from "../../src/model-move.js";
const camera = {
    position: { x: 0, y: 0, z: 10 },
    target: { x: 0, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
  },
  origin = { x: 0, y: 0, z: 0 };
test("screen translation follows the camera basis at model depth and keeps depth fixed", () => {
  const b = moveBasis(camera, origin, 400),
    p = movedPosition(origin, b, 100, -50);
  assert.ok(p.x > 0 && p.y > 0);
  assert.equal(p.z, 0);
  assert.ok(Math.abs(p.x / p.y - 2) < 1e-10);
  const twice = movedPosition(
    origin,
    moveBasis({ ...camera, position: { x: 0, y: 0, z: 20 } }, origin, 400),
    100,
    -50,
  );
  assert.equal(twice.x, p.x * 2);
  const side = moveBasis(
      {
        position: { x: 10, y: 0, z: 0 },
        target: origin,
        up: { x: 0, y: 0, z: 1 },
      },
      origin,
      400,
    ),
    q = movedPosition(origin, side, 100, -50);
  assert.equal(q.x, 0);
  assert.ok(q.y > 0 && q.z > 0);
});
function setup(tool = "move") {
  const listeners = new Map(),
    captured = new Set(),
    classes = new Set(),
    moves = [],
    ends = [];
  const canvas = {
    addEventListener(n, f) {
      listeners.set(n, f);
    },
    removeEventListener(n) {
      listeners.delete(n);
    },
    getBoundingClientRect() {
      return { height: 400 };
    },
    setPointerCapture(n) {
      captured.add(n);
    },
    hasPointerCapture(n) {
      return captured.has(n);
    },
    releasePointerCapture(n) {
      captured.delete(n);
    },
    focus() {},
    classList: {
      add(n) {
        classes.add(n);
      },
      remove(n) {
        classes.delete(n);
      },
      toggle(n, on) {
        if (on) classes.add(n);
        else classes.delete(n);
      },
    },
  };
  const rotations = [];
  const mover = bindModelMove(canvas, {
    getCamera: () => camera,
    getTool: () => tool,
    getModel: () => ({
      id: 7,
      position: origin,
      center: origin,
      radius: 1,
      rotation: { x: 0, y: 0, z: 0 },
    }),
    onRotate: (id, r) => rotations.push({ id, r }),
    onMove: (id, p) => moves.push({ id, p }),
    onEnd: (id, cancel) => ends.push(cancel),
  });
  const emit = (name, extra = {}) => {
    const e = {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientX: 10,
      clientY: 10,
      preventDefault() {
        this.prevented = true;
      },
      stopImmediatePropagation() {
        this.stopped = true;
      },
      ...extra,
    };
    listeners.get(name)?.(e);
    return e;
  };
  return { mover, emit, moves, ends, captured, listeners, rotations };
}
test("Move consumes only selected-model drags and leaves ordinary orbit/pan input alone", () => {
  const f = setup(),
    before = JSON.stringify(camera);
  assert.equal(f.emit("pointerdown").stopped, undefined);
  f.mover.setEnabled(true);
  assert.equal(f.emit("pointerdown", { shiftKey: true }).stopped, undefined);
  assert.equal(f.emit("pointerdown", { button: 2 }).stopped, undefined);
  assert.ok(f.emit("pointerdown").stopped);
  assert.ok(f.emit("pointermove", { clientX: 110 }).stopped);
  assert.ok(f.emit("wheel").stopped);
  f.emit("pointerup");
  assert.equal(f.moves.length, 1);
  assert.equal(f.moves[0].id, 7);
  assert.ok(f.moves[0].p.x > 0);
  assert.equal(JSON.stringify(camera), before);
  assert.equal(f.ends[0], false);
  assert.equal(f.captured.size, 0);
});
test("cancel, lost capture, disabling and disposal restore only the active model", () => {
  for (const action of [
    "pointercancel",
    "lostpointercapture",
    "disable",
    "dispose",
  ]) {
    const f = setup();
    f.mover.setEnabled(true);
    f.emit("pointerdown");
    f.emit("pointermove", { clientX: 110 });
    if (action === "disable") f.mover.setEnabled(false);
    else if (action === "dispose") f.mover.dispose();
    else f.emit(action);
    assert.deepEqual(f.moves.at(-1), { id: 7, p: origin });
    assert.deepEqual(f.ends, [true]);
    assert.equal(f.captured.size, 0);
    if (action === "dispose") assert.equal(f.listeners.size, 0);
  }
});
test("additional touches cannot move a second model or leak through to orbit controls", () => {
  const f = setup();
  f.mover.setEnabled(true);
  f.emit("pointerdown");
  assert.ok(f.emit("pointerdown", { pointerId: 2, isPrimary: false }).stopped);
  assert.ok(
    f.emit("pointermove", { pointerId: 2, isPrimary: false, clientX: 200 })
      .stopped,
  );
  assert.equal(f.moves.length, 0);
  assert.ok(f.emit("pointerup", { pointerId: 2 }).stopped);
  f.emit("pointermove", { clientX: 100 });
  f.emit("pointerup");
  assert.equal(f.moves.length, 1);
});
test("Rotate changes orientation only and cancellation restores the starting rotation", () => {
  const f = setup("rotate"),
    before = JSON.stringify(camera);
  f.mover.setEnabled(true);
  f.emit("pointerdown");
  f.emit("pointermove", { clientX: 110, clientY: 70 });
  assert.equal(f.moves.length, 0);
  assert.equal(f.rotations[0].id, 7);
  assert.ok(Object.values(f.rotations[0].r).some((v) => Math.abs(v) > 1));
  f.emit("pointercancel");
  assert.deepEqual(f.rotations.at(-1).r, { x: 0, y: 0, z: 0 });
  assert.equal(JSON.stringify(camera), before);
});
test("Depth dragging and wheel move only the selected model while consuming camera input", () => {
  const f = setup("depth"),
    before = JSON.stringify(camera);
  f.mover.setEnabled(true);
  f.emit("pointerdown");
  f.emit("pointermove", { clientY: 80 });
  assert.ok(f.moves[0].p.z < 0);
  f.emit("pointerup");
  assert.equal(f.rotations.length, 0);
  assert.ok(f.emit("wheel", { deltaY: -100, deltaMode: 0 }).stopped);
  assert.ok(f.moves.at(-1).p.z > 0);
  f.mover.setEnabled(false);
  assert.equal(f.emit("wheel", { deltaY: 100 }).stopped, undefined);
  assert.equal(JSON.stringify(camera), before);
});
