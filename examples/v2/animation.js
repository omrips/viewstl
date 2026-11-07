import StlViewer from "../../build/viewstl.js";
const vertices = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
];
const faces = [
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
const positions = new Float32Array(
  faces.flatMap((f) => f.flatMap((i) => vertices[i])),
);
const viewer = new StlViewer(document.getElementById("viewer"), {
  center_models: false,
  bg_color: "#ffffff",
  models: [
    { id: 0, data: { positions }, x: -4, color: "#307ca5" },
    {
      id: 1,
      data: {
        positions: positions.map((v, i) => v * (i % 3 === 0 ? 1.8 : 0.5)),
      },
      x: 3,
      color: "#cc6559",
    },
  ],
  animation_state_callback() {
    document.getElementById("state").textContent = [0, 1]
      .map(
        (id) =>
          `${id === 0 ? "Blue" : "Red"}: ${viewer.get_model_animation_state(id)?.status ?? "removed"}`,
      )
      .join(" · ");
  },
  load_error_callback(message) {
    document.getElementById("state").textContent = message;
  },
});
await viewer.when_idle();
viewer.set_camera_state({
  position: { x: 0, y: -16, z: 11 },
  target: { x: 0, y: 0, z: 0 },
  up: { x: 0, y: 0, z: 1 },
});
document.getElementById("state").textContent = "Ready. Press Play to animate.";
const reset = () => {
  for (const id of [0, 1]) {
    viewer.animate_model(id, null);
    viewer.set_position(id, id === 0 ? -4 : 3, 0, 0);
    viewer.set_rotation(id, 0, 0, 0);
    viewer.set_scale(id, 1);
  }
};
document.getElementById("play").onclick = () => {
  reset();
  viewer.animate_model(0, {
    delta: { rotationz: Math.PI * 2, msec: 5000, loop: true },
  });
  viewer.animate_model(1, {
    delta: {
      rotationx: 1,
      rotationy: 1.1,
      rotationz: 1.2,
      msec: 3000,
      loop: true,
    },
    exact: { x: 4, z: 2, scale: 1.5, msec: 2500 },
  });
};
document.getElementById("pause").onclick = () =>
  [0, 1].forEach((id) => viewer.pause_model_animation(id));
document.getElementById("resume").onclick = () =>
  [0, 1].forEach((id) => viewer.resume_model_animation(id));
document.getElementById("stop").onclick = () =>
  [0, 1].forEach((id) => viewer.animate_model(id, null));
document.getElementById("reset").onclick = () => {
  reset();
  document.getElementById("state").textContent =
    "Pose reset. Press Play to animate.";
};
window.addEventListener("pagehide", () => viewer.dispose(), { once: true });
