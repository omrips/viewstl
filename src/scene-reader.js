import { validateScene } from "./scene-import.js";
import { unzipChecked } from "./archive.js";

export function readSceneDocument(buffer, format, limits) {
  const files = Object.create(null);
  let bytes = buffer;
  if (format === "vsb") {
    const archive = unzipChecked(buffer, limits);
    bytes = archive.get("json_data.vsj");
    if (!bytes) throw new Error("VSB manifest json_data.vsj is missing");
    const scene = validateScene(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
      limits,
    );
    for (const m of scene.models) {
      const file = archive.get(m.filename);
      if (!file) throw new Error("VSB model file is missing: " + m.filename);
      files[m.filename] = file.buffer.slice(
        file.byteOffset,
        file.byteOffset + file.byteLength,
      );
    }
    return { scene, files };
  }
  return {
    scene: validateScene(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
      limits,
    ),
    files: null,
  };
}
