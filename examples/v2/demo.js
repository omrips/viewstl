import StlViewer from "../../build/viewstl.js";
import { binary, torusPositions } from "../../tests/v2/fixtures.js";
const $ = (id) => document.getElementById(id);
let selected = null;
const status = (text) => ($("status").textContent = text);
function refresh() {
  const current = $("model").value;
  $("model").replaceChildren();
  for (const model of viewer.models)
    if (model?.geometry) {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.filename || `Model ${model.id}`;
      $("model").append(option);
    }
  if ([...$("model").options].some((o) => o.value === current))
    $("model").value = current;
  selected = $("model").value === "" ? null : Number($("model").value);
  $("count").textContent = viewer.models_count;
  details();
}
function details() {
  const info = selected === null ? null : viewer.get_model_info(selected);
  $("info").replaceChildren();
  if (!info) return;
  for (const [key, value] of [
    ["Triangles", info.triangles.toLocaleString()],
    [
      "Size",
      `${info.dims.x.toFixed(1)} × ${info.dims.y.toFixed(1)} × ${info.dims.z.toFixed(1)}`,
    ],
    ["Units", info.units],
  ]) {
    const dt = document.createElement("dt"),
      dd = document.createElement("dd");
    dt.textContent = key;
    dd.textContent = value;
    $("info").append(dt, dd);
  }
  $("display").value = info.display;
  $("opacity").value = info.opacity;
  if (/^#[a-f\d]{6}$/i.test(info.color)) $("color").value = info.color;
}
const viewer = new StlViewer($("viewer"), {
  bg_color: "transparent",
  allow_drag_and_drop: true,
  load_error_callback: status,
  loading_progress_callback: (progress) => {
    const entries = Object.values(progress),
      loaded = entries.reduce((s, v) => s + v.loaded, 0);
    status(`Reading ${(loaded / 1e6).toFixed(1)} MB…`);
  },
  model_loaded_callback: () => {
    refresh();
    status("Ready. Your model stays in this browser.");
  },
  on_model_mouseclick: (id) => {
    if (id !== null) {
      $("model").value = id;
      selected = id;
      details();
    }
  },
});
async function sample() {
  viewer.clean();
  $("grid").checked = false;
  viewer.set_grid(false);
  const positions = torusPositions(128, 48);
  viewer.add_model({
    filename: "Sample torus.stl",
    local_file: new File([binary(positions)], "Sample torus.stl"),
    color: "#568bdc",
    display: "smooth",
  });
  await viewer.when_idle();
  viewer.set_camera_state({
    position: { x: 88, y: -110, z: 92 },
    target: { x: 0, y: 0, z: 0 },
    up: { x: 0, y: 0, z: 1 },
  });
  viewer.set_auto_zoom();
}
$("open").onclick = () => $("file").click();
$("file").onchange = (e) => {
  viewer.clean();
  for (const file of e.target.files)
    viewer.add_model({ local_file: file, display: $("display").value });
  e.target.value = "";
};
$("model").onchange = () => {
  selected = Number($("model").value);
  details();
};
$("display").onchange = (e) => {
  if (selected !== null) viewer.set_display(selected, e.target.value);
};
$("color").oninput = (e) => {
  if (selected !== null) viewer.set_color(selected, e.target.value);
};
$("opacity").oninput = (e) => {
  if (selected !== null) viewer.set_opacity(selected, Number(e.target.value));
};
$("edges").onchange = (e) => {
  if (selected !== null) viewer.set_edges(selected, e.target.checked);
};
$("grid").onchange = (e) => viewer.set_grid(e.target.checked);
$("rotate").onchange = (e) => viewer.set_auto_rotate(e.target.checked);
$("fit").onclick = () => viewer.set_auto_zoom();
$("clear").onclick = () => {
  viewer.clean();
  refresh();
  status("Drop a model to get started.");
};
$("sample").onclick = sample;
$("save").onclick = () => viewer.download_vsb("viewstl-scene.vsb");
$("image").onclick = async () => {
  try {
    const blob = await viewer.get_image_blob(),
      a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "viewstl.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } catch (e) {
    status(e.message);
  }
};
await viewer.when_ready;
await sample();
