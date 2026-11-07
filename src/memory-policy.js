const GiB = 1024 ** 3,
  MiB = 1024 ** 2;
export function memoryPolicy(reportedGiB) {
  const reported =
    typeof reportedGiB === "number" &&
    Number.isFinite(reportedGiB) &&
    reportedGiB >= 0.25 &&
    reportedGiB <= 128;
  // deviceMemory is an approximate total, not free RAM. Missing reports use 2 GiB.
  const estimated = (reported ? reportedGiB : 2) * GiB;
  const budget = Math.floor(estimated / 2);
  return {
    budget,
    reported,
    estimated,
    limits: {
      max_memory_bytes: budget,
      max_file_bytes: Math.floor(budget / 3),
      max_triangles: Math.max(1, Math.floor((budget - 64 * MiB) / 224)),
      max_uncompressed_bytes: Math.max(1, Math.floor((budget - 64 * MiB) / 4)),
    },
  };
}
export async function estimateFile(file) {
  if (/\.(step|stp|iges|igs)$/i.test(file.name))
    return 128 * MiB + (file.size || 0) * 40;
  // Count binary STL triangles from its small header before creating large arrays.
  if (/\.stl$/i.test(file.name) && file.size >= 84 && file.slice) {
    const header = await file.slice(0, 84).arrayBuffer();
    const count = new DataView(header).getUint32(80, true);
    if (count && 84 + count * 50 === file.size) return 64 * MiB + count * 224;
  }
  // Text and compressed formats get further checks inside their parsers.
  return 64 * MiB + (file.size || 0) * 3;
}
