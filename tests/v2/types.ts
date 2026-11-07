import StlViewer, {
  mountViewstlApp,
  type ViewstlAppState,
  type ModelInfo,
  type Scene,
  type ViewerOptions,
  type ExportResult,
} from "../../build/viewstl.js";
const options: ViewerOptions = {
  models: [{ id: 0, filename: "part.stl", opacity: 0 }],
  on_model_mouseclick: (id, event, distance, type) => {
    console.log(id, event.clientX, distance, type);
  },
  worker_factory: () => new Worker("/worker.js", { type: "module" }),
  animation_state_callback: (id, state, reason) =>
    console.log(id, state.status, state.elapsed_ms, reason),
  animation_complete_callback: (id, state) => console.log(id, state.status),
};
const viewer = new StlViewer(document.createElement("div"), options);
const info: ModelInfo | null = viewer.get_model_info(0);
const scene: Scene = viewer.get_vsj(true);
const text: string = viewer.get_vsj();
viewer.set_model_units(0, "inch", true);
viewer.set_view(0, { display: "mesh", smooth_shading: true });
viewer.set_smooth(0, false);
viewer.set_section(0, { axis: "z", position: 0.5, flip: true });
viewer.set_section(0, null);
viewer.set_selection(0);
viewer.set_selection(null);
const hit: { id: number; distance: number } | null = viewer.pick_model(
  100,
  100,
);
viewer.animate_model(0, {
  delta: { rotationy: Math.PI, msec: 1000, loop: true },
});
viewer.pause_model_animation(0);
viewer.resume_model_animation(0);
console.log(viewer.get_model_animation_state(0)?.tracks[0]?.progress);
void viewer.get_vsb_blob().then((blob) => blob.arrayBuffer());
void viewer
  .import_scene(new File([], "scene.vsj"), {
    files: [new File([], "part.stl")],
    signal: new AbortController().signal,
  })
  .then((result) => console.log(result.model_ids));
void viewer.get_image_blob();
void viewer
  .check_printability({
    model_ids: [0],
    level: "detailed",
    units_confirmed: true,
    profile: { technology: "fdm", min_wall_mm: 0.8, overhang_degrees: 45 },
    on_progress: (progress) => console.log(progress.phase),
  })
  .then((report) => {
    if (viewer.is_printability_current(report))
      viewer.show_printability(report, { issue: "boundary_edges" });
    viewer.clear_printability();
  });
const exportAbort = new AbortController();
const exported: Promise<ExportResult> = viewer.export_models({
  format: "stp",
  model_ids: "selected",
  units: "inch",
  apply_transforms: true,
  signal: exportAbort.signal,
  on_progress: ({ loaded, total, phase }) => console.log(loaded, total, phase),
});
void viewer.download_models({ format: "obj", model_ids: [0], colors: false });
void viewer
  .export_scene({ format: "vsj", force_basename: true })
  .then((result) => console.log(result.representation));
void viewer.download_scene({
  format: "vsb",
  signal: exportAbort.signal,
  on_progress: ({ loaded, total, phase }) => console.log(loaded, total, phase),
});
void exported.then((result) => console.log(result.blob, result.representation));
console.log(info, scene, text);
const app = mountViewstlApp(document, { sample_url: "/sample.stl" });
const state: ViewstlAppState = app.getState();
void app.openFiles([new File([], "test.stl")]);
app.select(0);
app.cancelLoading();
app.clear();
app.remove(0);
app.dispose();
console.log(state, info?.bounds, info?.has_colors, info?.source_units);
