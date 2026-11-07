import { binaryWriter } from "./parser.js";
import { assertMemory, MEMORY_OVERHEAD } from "./memory.js";

const formats = /^(stl|obj|3mf|step|stp|iges|igs|vsb|vsj)$/;

// The relay owns network policy. This worker owns admission, decoding and all
// geometry. A source URL is sent only to the explicitly configured relay.
export async function readRemote(task, progress = () => {}) {
  const response = await fetch(task.relay, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: task.remote,
      format: task.format || "",
      max_bytes: task.limits.max_file_bytes,
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : `URL import failed (HTTP ${response.status}).`,
    );
  }
  const format = response.headers.get("x-viewstl-format") || "";
  if (!formats.test(format) || !response.body) {
    await response.body?.cancel();
    throw new Error("The URL relay returned an invalid response.");
  }
  let name;
  try {
    name = decodeURIComponent(response.headers.get("x-viewstl-filename") || "");
  } catch {}
  name =
    name?.replace(/[\x00-\x1f\x7f/\\]/g, "").slice(0, 200) ||
    `download.${format}`;
  const total = Number(response.headers.get("content-length")) || 0;
  const limits = task.limits;
  const cad = /^(step|stp|iges|igs)$/.test(format);
  const limit = cad
    ? Math.min(
        limits.max_file_bytes,
        Math.max(
          0,
          Math.floor(
            ((limits.max_memory_bytes ?? Number.MAX_SAFE_INTEGER) -
              128 * 1024 ** 2) /
              40,
          ),
        ),
      )
    : limits.max_file_bytes;
  if (total > limit) {
    await response.body.cancel();
    throw new Error("File size limit exceeded for this device.");
  }
  let data;
  try {
    data = await decodeRemoteStream(
      response.body,
      { ...limits, max_file_bytes: limit },
      format,
      total,
      progress,
    );
  } catch (error) {
    if (error instanceof TypeError)
      throw new Error(
        "The download stopped before it completed. Try again or open a local copy.",
      );
    throw error;
  }
  let base;
  try {
    base = decodeURIComponent(response.headers.get("x-viewstl-base-url") || "");
  } catch {}
  return { ...data, name, format, base };
}

export async function decodeRemoteStream(
  stream,
  limits,
  format,
  total,
  progress = () => {},
) {
  const reader = stream.getReader();
  let size = 0,
    decided = format !== "stl",
    writer = null,
    triangles = 0,
    expected = 0;
  let pending = [],
    headerSize = 0,
    carry = new Uint8Array(0),
    skip = 84;
  let chunks = [],
    output = null,
    outputOffset = 0;
  const buffer = (value) => {
    assertMemory(
      limits,
      MEMORY_OVERHEAD + Math.max(size, total) * 3,
      "remote file",
    );
    if (total) {
      output ??= new Uint8Array(total);
      if (outputOffset + value.length > total)
        throw new Error("The download length changed.");
      output.set(value, outputOffset);
      outputOffset += value.length;
    } else chunks.push(value);
  };
  const binary = (value) => {
    if (skip) {
      const n = Math.min(skip, value.length);
      value = value.subarray(n);
      skip -= n;
    }
    if (carry.length) {
      const joined = new Uint8Array(carry.length + value.length);
      joined.set(carry);
      joined.set(value, carry.length);
      value = joined;
    }
    const end = value.length - (value.length % 50);
    const view = new DataView(value.buffer, value.byteOffset, end);
    for (let i = 0; i < end; i += 50) {
      if (84 + (triangles + 1) * 50 > expected)
        throw new Error("The STL download contains extra data.");
      writer.write(view, i, triangles++);
    }
    carry = value.slice(end);
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limits.max_file_bytes)
        throw new Error("File size limit exceeded.");
      if (!decided) {
        pending.push(value);
        headerSize += value.length;
        if (headerSize >= 84) {
          const header = new Uint8Array(84);
          let offset = 0;
          for (const p of pending) {
            const part = p.subarray(0, 84 - offset);
            header.set(part, offset);
            offset += part.length;
            if (offset === 84) break;
          }
          const count = new DataView(header.buffer).getUint32(80, true);
          expected = 84 + count * 50;
          // A known length disambiguates even binary STL headers beginning with
          // "solid". Unknown-length candidates are validated again at EOF.
          if (
            count &&
            (total ? expected === total : expected <= limits.max_file_bytes)
          )
            writer = binaryWriter(count, header.subarray(0, 80), limits);
          decided = true;
          for (const p of pending) writer ? binary(p) : buffer(p);
          pending = [];
        }
      } else writer ? binary(value) : buffer(value);
      progress(size, total);
    }
    if (!size || (total && size !== total))
      throw new Error("The download is empty or incomplete.");
    if (writer) {
      if (size !== expected || carry.length || triangles * 50 + 84 !== expected)
        throw new Error("The STL download is incomplete.");
      return { geometry: writer.finish(), size };
    }
    for (const p of pending) buffer(p);
    if (!output) {
      output = new Uint8Array(size);
      for (const p of chunks) {
        output.set(p, outputOffset);
        outputOffset += p.length;
      }
    }
    return { buffer: output.buffer, size };
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}
