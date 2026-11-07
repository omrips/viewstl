// Conservative working-set estimates, including CPU geometry and GPU buffers.
// These are policy checks, not measurements of free RAM or GPU memory.
export const MEMORY_OVERHEAD = 64 * 1024 * 1024;
export const TRIANGLE_MEMORY = 224;
export function geometryMemory(g) {
  if (!g) return 0;
  return (
    g.triangles * TRIANGLE_MEMORY +
    (g.smoothNormals?.byteLength || 0) * 4 +
    ((g.edges?.byteLength || 0) + (g.wire?.byteLength || 0)) * 2
  );
}
export function assertMemory(limits, bytes, operation = "model") {
  if (bytes > (limits.max_memory_bytes ?? Number.MAX_SAFE_INTEGER))
    throw new Error(
      `Estimated memory for this ${operation} exceeds the device safety budget. Use a smaller model or a device with more memory.`,
    );
}
export function derivedMemory(triangles, features) {
  return (
    MEMORY_OVERHEAD +
    triangles *
      (TRIANGLE_MEMORY +
        (features.smooth ? 1536 : 0) +
        (features.edges || features.wire ? 2048 : 0))
  );
}
