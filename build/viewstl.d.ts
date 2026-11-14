export interface Vector3 {
  x: number;
  y: number;
  z: number;
}
export interface CameraState {
  position: Vector3;
  up: Vector3;
  target: Vector3;
}
export type Display =
  | "flat"
  | "smooth"
  | "wireframe"
  | "edges"
  | "mesh"
  | "xray"
  | "studio"
  | "orientation";
export interface Section {
  axis: "x" | "y" | "z";
  position: number;
  flip?: boolean;
}
export type Units = "mm" | "inch";
export type ExportFormat =
  "stl" | "obj" | "3mf" | "step" | "stp" | "iges" | "igs";
export interface ExportProgress {
  /** Number of triangles encoded; completion also includes packaging. */
  loaded: number;
  total: number;
  phase: "exporting" | "complete";
}
export interface ExportOptions {
  format: ExportFormat;
  /** Omit for all models. Loading models cause rejection. */
  model_ids?: number[] | "selected";
  filename?: string;
  /** Output coordinates/units; the scene coordinate system is millimeters. */
  units?: Units;
  /** Default true. False exports source coordinates plus unit conversion only. */
  apply_transforms?: boolean;
  /** Default true for OBJ/3MF. Colored OBJ returns a ZIP with OBJ and MTL. */
  colors?: boolean;
  signal?: AbortSignal;
  on_progress?: (progress: ExportProgress) => void;
}
export interface ExportResult {
  blob: Blob;
  filename: string;
  format: "stl" | "obj" | "3mf" | "step" | "iges";
  units: Units;
  model_ids: number[];
  triangles: number;
  representation: "mesh";
}
export interface Transform {
  x?: number;
  y?: number;
  z?: number;
  rotationx?: number;
  rotationy?: number;
  rotationz?: number;
  scale?: number;
  scalex?: number;
  scaley?: number;
  scalez?: number;
}
export interface SceneExportOptions {
  format: "vsb" | "vsj";
  filename?: string;
  /** VSJ only: strip paths/query strings from model references. Default false. */
  force_basename?: boolean;
  signal?: AbortSignal;
  on_progress?: (progress: {
    loaded: number;
    total: number;
    phase: "exporting" | "packaging" | "complete";
  }) => void;
}
export interface SceneExportResult {
  blob: Blob;
  filename: string;
  format: "vsb" | "vsj";
  model_ids: number[];
  triangles: number;
  representation: "scene";
}
export interface AnimationTrack extends Transform {
  msec?: number;
  /** Continuous accumulation; applies to delta only. */
  loop?: boolean;
}
export interface Animation {
  delta?: AnimationTrack;
  exact?: AnimationTrack;
}
export interface AnimationPlaybackState {
  status: "idle" | "running" | "paused" | "stopped" | "completed";
  elapsed_ms: number;
  /** Temporarily suspended by a hidden document or lost graphics context. */
  suspended: boolean;
  tracks: Array<{
    mode: "delta" | "exact";
    msec: number;
    loop: boolean;
    progress: number;
  }>;
}
export type AnimationStateReason =
  | "started"
  | "restored"
  | "replaced"
  | "paused"
  | "resumed"
  | "completed"
  | "stopped"
  | "manual"
  | "removed"
  | "clean"
  | "error";
/** Serialized scene playback. Normally created by get_vsj/export_scene. */
export interface SavedAnimationState {
  version: 1;
  elapsed_ms: number;
  paused: boolean;
  origin: Required<Omit<Transform, "scale">>;
  center: [number, number, number];
}
export interface GeometryData {
  positions: Float32Array | number[];
  colors?: Float32Array | number[] | null;
}
export interface ModelSize {
  version: 1;
  baseline_mm: [number, number, number];
  unit_factor?: number;
  file_units: Units;
  editable: boolean;
  dimensions_mm: [number, number, number];
}
export interface CameraBookmark {
  name: string;
  camera: CameraState;
}
export interface ModelMeasurements {
  area_mm2: number;
  volume_mm3: number | null;
  volume_valid: boolean;
  volume_reason: string;
}
export interface ModelOptions extends Transform {
  /** Display label; filename remains the source reference for VSJ. */
  display_name?: string;
  size_state?: Omit<ModelSize, "dimensions_mm">;
  id?: number;
  filename?: string;
  /** Retrieve a public URL through the explicitly configured same-origin relay. */
  remote_url?: string;
  remote_format?: "" | "stl" | "obj" | "3mf" | "step" | "stp" | "iges" | "igs";
  orig_filename?: string;
  local_file?: File | Blob;
  mesh?: unknown;
  data?: GeometryData;
  display?: Display;
  smooth_shading?: boolean;
  section?: Section | null;
  color?: string | null;
  opacity?: number;
  view_edges?: boolean;
  units?: Units;
  animation?: Animation | null;
  animation_state?: SavedAnimationState | null;
}
export type ModelClick = (
  id: number | null,
  event: PointerEvent | MouseEvent,
  distance: number,
  type: 1 | 3 | 11 | 20,
) => void;
export interface ViewerOptions {
  models?: ModelOptions[];
  width?: string | number;
  height?: string | number;
  canvas_width?: string | number;
  canvas_height?: string | number;
  bg_color?: string;
  bgcolor?: string;
  camerax?: number;
  cameray?: number;
  cameraz?: number;
  camera_state?: CameraState;
  zoom?: number;
  center_models?: boolean;
  auto_resize?: boolean;
  auto_rotate?: boolean;
  mouse_zoom?: boolean;
  allow_drag_and_drop?: boolean;
  controls?: 0 | 1;
  grid?: boolean;
  send_no_model_click_event?: boolean;
  pixel_ratio?: number;
  worker_url?: string | URL;
  worker_factory?: () => Worker;
  worker_count?: number;
  worker_timeout?: number;
  url_import_endpoint?: string;
  load_three_files?: string | false;
  jszip_path?: string;
  jszip_utils_path?: string;
  three?: unknown;
  max_file_bytes?: number;
  max_triangles?: number;
  max_uncompressed_bytes?: number;
  max_archive_entries?: number;
  max_memory_bytes?: number;
  ready_callback?: () => void;
  all_loaded_callback?: () => void;
  model_loaded_callback?: (id: number) => void;
  load_error_callback?: (message: string) => void;
  loading_progress_callback?: (
    status: Record<
      number,
      { loaded: number; total: number; phase?: "loading-cad" | "parsing-cad" }
    >,
    session: number,
  ) => void;
  on_model_drop?: (filename: string) => void;
  on_model_mouseclick?: ModelClick;
  on_model_mousedown?: ModelClick;
  animation_state_callback?: (
    id: number,
    state: AnimationPlaybackState,
    reason: AnimationStateReason,
  ) => void;
  animation_complete_callback?: (
    id: number,
    state: AnimationPlaybackState,
  ) => void;
}
export interface ModelInfo {
  name: string;
  orig_filename: string | null;
  position: Vector3;
  dims: Vector3;
  rotation: Vector3;
  display: Display;
  smooth_shading: boolean;
  section: Section | null;
  color: string;
  scale: Vector3;
  volume: number;
  area: number;
  triangles: number;
  /** Source-space bounds, copied without exposing geometry buffers. */
  bounds: { min: number[]; max: number[] };
  has_colors: boolean;
  /** Physical units specified by the file; null for unitless STL/OBJ. */
  source_units: string | null;
  units: Units;
  opacity: number;
  file_bytes: number | null;
}
export interface Scene {
  canvas_height: string | number;
  bg_color: string;
  camera_state: CameraState;
  auto_rotate: boolean;
  mouse_zoom: boolean;
  auto_resize: boolean;
  camera_bookmarks?: CameraBookmark[];
  display_units?: Units;
  center_models: boolean;
  grid?: boolean;
  infinite_grid?: { spacing: number; height: number };
  models: ModelOptions[];
}
export interface BinaryScene {
  vsj: Scene;
  files: Array<{ id: number; bin: ArrayBuffer }>;
}
export class StlViewer {
  static version: string;
  static workerURL: string | URL | null;
  constructor(container: HTMLElement, options?: ViewerOptions);
  readonly when_ready: Promise<StlViewer>;
  readonly ready: boolean;
  readonly error: string | null;
  readonly models_count: number;
  readonly load_session: number;
  readonly canvas: HTMLCanvasElement;
  readonly controls: { enabled: boolean; noZoom: boolean };
  when_idle(): Promise<StlViewer>;
  add_model(model: ModelOptions): void;
  add_models(models: ModelOptions[]): void;
  remove_model(id: number): void;
  clean(): void;
  dispose(): void;
  set_display(id: number, display: Display): void;
  set_view(
    id: number,
    options: { display?: Display; smooth_shading?: boolean },
  ): void;
  set_smooth(id: number, enabled: boolean): void;
  set_section(id: number, section: Section | null): void;
  set_color(id: number, color: string | null): void;
  set_opacity(id: number, opacity: number): void;
  set_position(id: number, x?: number, y?: number, z?: number): void;
  /** Show a 3D editing frame; null clears it. Excluded from PNG and scene exports. */
  set_selection(id: number | null): void;
  /** Pick the nearest visible surface at viewport coordinates (e.g. event.clientX/Y). */
  pick_model(
    clientX: number,
    clientY: number,
  ): { id: number; distance: number } | null;
  set_scale(
    id: number,
    x: number,
    y?: number,
    z?: number,
    keepPrevious?: boolean,
  ): void;
  set_rotation(
    id: number,
    x?: number,
    y?: number,
    z?: number,
    increment?: boolean,
  ): void;
  rotate(id: number, x?: number, y?: number, z?: number): void;
  set_edges(id: number, enabled: boolean): void;
  set_grid(enabled: boolean, size?: number, divisions?: number): void;
  set_infinite_grid(enabled: boolean, spacing?: number, height?: number): void;
  set_model_units(id: number, units: Units, scale?: boolean): void;
  set_bg_color(color: string): void;
  set_center_models(enabled: boolean): void;
  set_zoom(zoom?: number): void;
  set_auto_zoom(): void;
  set_auto_rotate(enabled: boolean): void;
  set_mouse_zoom(enabled: boolean): void;
  set_auto_resize(enabled: boolean): void;
  do_resize(): void;
  set_on_model_mousedown(callback: ModelClick | null): void;
  set_on_model_mouseclick(callback: ModelClick | null): void;
  set_drag_and_drop(enabled: boolean): void;
  get_camera_state(): CameraState;
  set_camera_state(state: Partial<CameraState>): void;
  set_camera(x?: number, y?: number, z?: number): void;
  get_model_info(id: number): ModelInfo | null;
  get_model_info(
    id: number,
    options: { measurements: false },
  ): (Omit<ModelInfo, "area" | "volume"> & { area: null; volume: null }) | null;
  get_model_size(id: number): ModelSize;
  /** Multiplicative XYZ factors about the world-space center. Throws on invalid input. */
  resize_model(id: number, factors: [number, number, number]): ModelSize;
  set_file_units(id: number, units: Units): ModelSize;
  reset_model_size(id: number): ModelSize;
  duplicate_model(id: number): number;
  display_units: Units;
  set_display_units(units: Units): void;
  set_camera_view(
    name: "front" | "back" | "left" | "right" | "top" | "bottom" | "isometric",
  ): void;
  get_camera_bookmarks(): CameraBookmark[];
  set_camera_bookmarks(bookmarks: CameraBookmark[]): void;
  measure_model(
    id: number,
    options?: {
      signal?: AbortSignal;
      max_time_ms?: number;
      on_progress?: (progress: { phase: string; elapsed_ms: number }) => void;
    },
  ): Promise<ModelMeasurements>;
  get_model_data(id: number): GeometryData | null;
  get_model_mesh(id: number): unknown;
  get_stl_bin(id: number): ArrayBuffer | null;
  check_printability(options?: PrintCheckOptions): Promise<PrintReport>;
  is_printability_current(report: PrintReport): boolean;
  show_printability(
    report: PrintReport,
    options: { issue: string; model_id?: number },
  ): number;
  clear_printability(): void;
  export_models(options: ExportOptions): Promise<ExportResult>;
  download_models(options: ExportOptions): Promise<ExportResult>;
  download_model(id: number, filename?: string): void;
  get_vsj(
    as_js_obj?: false,
    force_basename?: boolean,
    for_vsb?: boolean,
  ): string;
  get_vsj(as_js_obj: true, force_basename?: boolean, for_vsb?: boolean): Scene;
  download_vsj(filename?: string): void;
  /** Whole-scene export. VSB contains STL meshes; VSJ contains references only. */
  export_scene(options: SceneExportOptions): Promise<SceneExportResult>;
  download_scene(options: SceneExportOptions): Promise<SceneExportResult>;
  load_vsj(source: string | File | Blob): void;
  /** Add a scene atomically. URLs/references use the configured same-origin relay. */
  import_scene(
    source: string | File | Blob,
    options?: {
      format?: "vsb" | "vsj";
      files?: File[];
      signal?: AbortSignal;
      on_progress?: (progress: {
        loaded: number;
        total: number;
        phase: string;
      }) => void;
    },
  ): Promise<{
    model_ids: number[];
    scene: Partial<Scene>;
    used_files: File[];
  }>;
  get_vsb(): BinaryScene;
  get_vsb_blob(): Promise<Blob>;
  download_vsb(filename?: string): Promise<void | null>;
  load_vsb(source: string | File | Blob): void;
  animate_model(id: number, animation: Animation | null): void;
  pause_model_animation(id: number): void;
  resume_model_animation(id: number): void;
  get_model_animation_state(id: number): AnimationPlaybackState | null;
  get_image_blob(type?: string): Promise<Blob>;
}
export default StlViewer;

export type SessionArrangement = "original" | "side-by-side" | "custom";
export interface SessionModel {
  id: number;
  name: string;
  size: number | null;
  units: string | null;
  bounds: { min: number[]; max: number[] };
  position: Vector3;
  /** Euler XYZ in degrees, rotated around the model center. */
  rotation: Vector3;
  originalPosition: Vector3;
  originalRotation: Vector3;
  embedded: boolean;
  color: string | null;
  originalColor: string | null;
  animationPivot?: boolean;
  animation: AnimationPlaybackState | null;
  animationDefinition: Animation | null;
}
export type SessionEvent =
  | { type: "ready" }
  | { type: "busy"; busy: boolean }
  | { type: "opening" | "load-failed"; name: string }
  | { type: "loaded"; name: string; id: number }
  | { type: "scene-loaded"; name: string; ids: number[] }
  | { type: "error"; code: string; message: string; source?: string }
  | {
      type: "animation";
      id: number;
      state: AnimationPlaybackState;
      reason: AnimationStateReason;
    }
  | {
      type: "progress";
      scene: boolean;
      progress: { phase?: string; loaded?: number; total?: number };
    };
export interface ViewerSessionOptions {
  /** Initial models are added through openFiles/openURL, not viewer_options. */
  viewer_options?: Omit<ViewerOptions, "models" | "allow_drag_and_drop">;
  device_memory?: number;
  /** Optional fallback colors for models with no embedded colors. */
  colors?: string[];
  on_event?: (event: SessionEvent) => void;
}
export interface ManipulationOptions {
  /** Event is absent for wheel input. Return null to ignore an empty hit. */
  getModelId(event?: PointerEvent): number | null;
  getTool(): "move" | "rotate" | "depth";
  onChange?(id: number): void;
  onStart?(id: number): void;
  onEnd?(id: number, cancelled: boolean): void;
}
export interface ManipulationBinding {
  setEnabled(enabled: boolean): void;
  dispose(): void;
}
/** UI-independent queue/scene/editor session. Mounting creates no WebGL context.
 * Use viewer for existing rendering, saving, analysis, resize and camera APIs.
 * Methods taking angles use degrees; StlViewer's original methods retain radians.
 */
export class ViewerSession {
  constructor(container: HTMLElement, options?: ViewerSessionOptions);
  readonly viewer: StlViewer | null;
  readonly busy: boolean;
  readonly arrangement: SessionArrangement;
  readonly grid: { enabled: boolean; spacing: number; height: number };
  readonly memoryPolicy: {
    budget: number;
    estimated: number;
    reported: boolean;
    limits: {
      max_memory_bytes: number;
      max_file_bytes: number;
      max_triangles: number;
      max_uncompressed_bytes: number;
    };
  };
  ready(): Promise<StlViewer>;
  openFiles(
    files: Iterable<File | { name: string; url: string; size?: number }>,
  ): Promise<void>;
  openURL(
    url: string,
    format?: ModelOptions["remote_format"] | "vsb" | "vsj",
  ): Promise<void>;
  cancelLoading(): void;
  /** Detached constant-size metadata; no geometry copies or mesh scans. */
  getModel(id: number): SessionModel | null;
  getModels(): SessionModel[];
  setPosition(id: number, position: Vector3): boolean;
  setRotation(id: number, degrees: Vector3): boolean;
  prepareManual(id: number): void;
  centerPivot(id: number): void;
  moveDepth(id: number, amount: number): boolean;
  bindManipulation(options: ManipulationOptions): ManipulationBinding;
  setArrangement(mode: SessionArrangement): void;
  setGrid(enabled: boolean, spacing?: number, height?: number): void;
  duplicate(id: number): number;
  remove(id: number): void;
  clear(): void;
  dispose(): void;
}

export interface PrintProfile {
  technology: "fdm";
  build_volume_mm?: [number, number, number];
  min_wall_mm?: number;
  line_width_mm?: number;
  /** Maximum overhang measured from vertical. +Z is print up. */
  overhang_degrees?: number;
}
export interface PrintProgress {
  phase: string;
  elapsed_ms?: number;
  model_id?: number;
  model_index?: number;
  total_models: number;
}
export interface PrintCheckOptions {
  model_ids?: number[] | "selected";
  level?: "basic" | "detailed";
  apply_transforms?: boolean;
  units_confirmed?: boolean;
  profile?: PrintProfile | null;
  max_time_ms?: number;
  signal?: AbortSignal;
  on_progress?: (progress: PrintProgress) => void;
}
export interface PrintCheck {
  code: string;
  label: string;
  severity: "error" | "warning" | "info";
  status: "pass" | "issue" | "inconclusive" | "not_run";
  count: number;
  message: string;
  triangle_ids: number[];
  edge_vertices: number[];
  estimated?: boolean;
  area_mm2?: number;
  samples?: number;
  minimum_sampled_mm?: number | null;
  unresolved_samples?: number;
}
export interface PrintModelReport {
  model_id: number;
  name: string;
  triangles: number;
  checks: PrintCheck[];
  dimensions_mm: number[] | null;
  volume_mm3: number | null;
  volume_valid: boolean;
  tolerance_mm?: number;
  elapsed_ms: number;
  limit_reason?: "time";
  summary: "issues_found" | "incomplete" | "no_issues_found";
}
export interface PrintReport {
  version: 1;
  model_ids: number[];
  models: PrintModelReport[];
  settings: Omit<PrintCheckOptions, "signal" | "on_progress" | "model_ids">;
  summary: "issues_found" | "incomplete" | "no_issues_found";
  scope: string;
  estimated: boolean;
}
