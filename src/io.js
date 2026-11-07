export async function readSource(source, limit, progress = () => {}, signal) {
  let stream,
    total = 0;
  if (source instanceof ArrayBuffer) {
    if (source.byteLength > limit) throw new Error("File size limit exceeded");
    progress(source.byteLength, source.byteLength);
    return source;
  }
  if (source instanceof Blob) {
    total = source.size;
    if (total > limit) throw new Error("File size limit exceeded");
    if (signal?.aborted)
      throw new DOMException("Loading cancelled", "AbortError");
    progress(0, total);
    const buffer = await source.arrayBuffer();
    if (signal?.aborted)
      throw new DOMException("Loading cancelled", "AbortError");
    progress(total, total);
    return buffer;
  } else {
    const url = new URL(String(source), globalThis.location?.href);
    if (!["http:", "https:", "blob:"].includes(url.protocol))
      throw new Error("Unsupported file URL protocol");
    const response = await fetch(url, { signal, credentials: "same-origin" });
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${url.pathname}`);
    // Content-Length can describe compressed bytes, so it is only a progress hint.
    total = Number(response.headers.get("content-length")) || 0;
    stream = response.body;
  }
  if (total > limit) throw new Error("File size limit exceeded");
  if (!stream) throw new Error("Empty response body");
  const reader = stream.getReader(),
    chunks = [];
  let size = 0;
  try {
    while (true) {
      if (signal?.aborted)
        throw new DOMException("Loading cancelled", "AbortError");
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new Error("File size limit exceeded");
      chunks.push(value);
      progress(size, Math.max(total, size));
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(size);
  let p = 0;
  for (const chunk of chunks) {
    data.set(chunk, p);
    p += chunk.length;
  }
  progress(size, size);
  return data.buffer;
}
