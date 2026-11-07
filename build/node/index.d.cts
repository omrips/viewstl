/** Physical scale for unitless STL/OBJ files. 3MF/STEP/IGES honor file units. */
export type AnalysisUnits = "mm" | "cm" | "m" | "in" | "ft" | "um";
export type AnalysisFormat =
  "stl" | "obj" | "3mf" | "step" | "stp" | "iges" | "igs";
export interface AnalysisLimits {
  max_file_bytes?: number;
  max_triangles?: number;
  max_uncompressed_bytes?: number;
  max_archive_entries?: number;
  /** Estimated working-set admission budget, not a process RSS cap. */
  max_memory_bytes?: number;
}
export interface AnalysisProfile {
  technology: "fdm";
  min_wall_mm?: number;
  line_width_mm?: number;
  overhang_degrees?: number;
  build_volume_mm?: [number, number, number];
}
export interface AnalysisProgress {
  phase: string;
  elapsed_ms: number;
  loaded?: number;
  total?: number;
}
export interface AnalysisOptions {
  format?: AnalysisFormat;
  units?: AnalysisUnits;
  /** Defaults to detailed. Basic reports omit intersection/validated-volume checks. */
  level?: "basic" | "detailed";
  profile?: AnalysisProfile | null;
  /** Whole job deadline, including queueing and file parsing; default 120000. */
  timeout_ms?: number;
  /** Mesh-check deadline, at most 120000; default 30000. May return a partial report. */
  max_time_ms?: number;
  limits?: AnalysisLimits;
  signal?: AbortSignal;
  on_progress?: (progress: AnalysisProgress) => void;
}
export interface BufferAnalysisOptions extends AnalysisOptions {
  /** Supply filename or format for Buffer/Uint8Array/ArrayBuffer input. */
  filename?: string;
}
export interface AnalysisCheck {
  code: string;
  label: string;
  severity: "error" | "warning" | "info";
  status: "pass" | "issue" | "not_run" | "inconclusive";
  count: number;
  triangle_ids: number[];
  edge_vertices: number[];
  message: string;
  estimated?: boolean;
  area_mm2?: number;
  samples?: number;
  minimum_sampled_mm?: number | null;
  unresolved_samples?: number;
}
export interface AnalysisReport {
  schema_version: 1;
  model_id: number;
  name: string;
  filename: string;
  format: "stl" | "obj" | "3mf" | "step" | "iges";
  file_bytes: number;
  triangles: number;
  /** Known physical measurements are normalized to mm; null means unitless. */
  units: "mm" | null;
  units_source: "file" | "option" | null;
  /** Measurements in mm when units are known, otherwise in input coordinate units. */
  dimensions: [number, number, number] | null;
  surface_area: number;
  volume: number | null;
  dimensions_mm: [number, number, number] | null;
  surface_area_mm2: number | null;
  volume_mm3: number | null;
  /** Validated mesh volume; does not by itself confirm physical units or printability. */
  volume_valid: boolean;
  checks: AnalysisCheck[];
  summary: "no_issues_found" | "issues_found" | "incomplete";
  elapsed_ms: number;
  tolerance_mm?: number;
  limit_reason?: "time";
  settings: {
    level: "basic" | "detailed";
    profile: AnalysisProfile | null;
    apply_transforms: boolean;
    units_confirmed: boolean;
    max_time_ms: number;
  };
}
export interface AnalyzerOptions {
  /** Number of simultaneous disposable workers; default 2, range 1–8. */
  concurrency?: number;
  /** Number of waiting jobs; default 16. */
  max_queue?: number;
  /** Maximum copied buffer bytes waiting in the queue; default 128 MiB. */
  max_queued_bytes?: number;
}
export interface Analyzer {
  analyzeFile(
    path: string | URL,
    options?: AnalysisOptions,
  ): Promise<AnalysisReport>;
  analyzeBuffer(
    data: Uint8Array | ArrayBuffer,
    options: BufferAnalysisOptions,
  ): Promise<AnalysisReport>;
  /** Cancel queued/running jobs and wait for worker termination. */
  dispose(): Promise<void>;
}
/** Analyze a local regular file. HTTP(S) URLs and network-share paths are rejected. */
export function analyzeFile(
  path: string | URL,
  options?: AnalysisOptions,
): Promise<AnalysisReport>;
/** The caller's data is copied and is never detached or modified. */
export function analyzeBuffer(
  data: Uint8Array | ArrayBuffer,
  options: BufferAnalysisOptions,
): Promise<AnalysisReport>;
export function createAnalyzer(options?: AnalyzerOptions): Analyzer;
