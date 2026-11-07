import { scaledStats } from "./geometry.js";
import { checkMesh } from "./print-check.js";
import { modelMatrix } from "./math.js";

export function measure(task, progress = () => {}) {
  const { positions, scale, area, limits } = task;
  const surface = scaledStats({ positions, area, volume: 0 }, scale).area;
  const report = checkMesh(
    {
      positions,
      matrix: modelMatrix({
        x: 0,
        y: 0,
        z: 0,
        rotationx: 0,
        rotationy: 0,
        rotationz: 0,
        center: [0, 0, 0],
        scaleVector: scale,
      }),
    },
    { level: "detailed", max_time_ms: task.max_time_ms },
    limits,
    progress,
  );
  const reason = report.checks.find((c) => c.code === "shell_orientation");
  return {
    area_mm2: surface,
    volume_mm3: report.volume_valid ? report.volume_mm3 : null,
    volume_valid: report.volume_valid,
    volume_reason: report.volume_valid
      ? "Closed, consistently oriented mesh; no intersections detected."
      : reason.message,
  };
}
