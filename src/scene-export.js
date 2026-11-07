import { exportSTL } from "./geometry.js";
import { zipScene } from "./archive.js";

// Keep the established VSB layout: json_data.vsj plus one colored binary STL per model.
// Snapshot buffers belong to this worker; the live renderer retains its own buffers.
export function exportSceneArchive(scene, models, limits, progress) {
  const files = [];
  for (const model of models) {
    files.push({
      id: model.id,
      bin: exportSTL(model, model.scale, model.center),
    });
    progress({
      loaded: files.length,
      total: models.length,
      phase: "exporting",
    });
  }
  progress({ loaded: models.length, total: models.length, phase: "packaging" });
  const bytes = zipScene({ vsj: scene, files }, limits);
  progress({ loaded: models.length, total: models.length, phase: "complete" });
  return new Blob([bytes], { type: "application/zip" });
}
