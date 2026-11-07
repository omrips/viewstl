export function printOptions(input = {}) {
  const level = input.level ?? "basic";
  if (!["basic", "detailed"].includes(level))
    throw new Error("Choose basic or detailed print checks");
  const number = (v, name, max = 1e9) => {
    if (!Number.isFinite(v) || v <= 0 || v > max)
      throw new Error(`Invalid ${name}`);
    return v;
  };
  let profile = null;
  if (input.profile != null) {
    if (input.profile.technology !== "fdm")
      throw new Error("Only FDM profiles are supported");
    profile = { technology: "fdm" };
    for (const key of ["min_wall_mm", "line_width_mm"])
      if (input.profile[key] != null)
        profile[key] = number(input.profile[key], key);
    if (input.profile.overhang_degrees != null)
      profile.overhang_degrees = number(
        input.profile.overhang_degrees,
        "overhang angle",
        89.9,
      );
    if (input.profile.build_volume_mm != null) {
      if (
        !Array.isArray(input.profile.build_volume_mm) ||
        input.profile.build_volume_mm.length !== 3
      )
        throw new Error("Build volume requires X, Y and Z");
      profile.build_volume_mm = input.profile.build_volume_mm.map((v) =>
        number(v, "build volume"),
      );
    }
  }
  const time = number(input.max_time_ms ?? 30000, "check time limit", 120000);
  return {
    level,
    profile,
    apply_transforms: input.apply_transforms !== false,
    units_confirmed: input.units_confirmed === true,
    max_time_ms: time,
  };
}
export const printMemory = (triangles) => 64 * 1024 ** 2 + triangles * 2400;
export const printSignature = (model) =>
  JSON.stringify([
    model.x,
    model.y,
    model.z,
    model.rotationx,
    model.rotationy,
    model.rotationz,
    model.scaleVector,
    model.center,
    model.units,
    model.unitScale,
  ]);
