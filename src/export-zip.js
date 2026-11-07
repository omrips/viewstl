import { Zip, ZipDeflate } from "fflate";
import { OutputBudget } from "./export-utils.js";

export function zipExport(files, limits) {
  if (files.length > limits.max_archive_entries)
    throw new Error("Export archive entry limit exceeded");
  const parts = [],
    budget = new OutputBudget(limits.max_file_bytes);
  const zip = new Zip((error, chunk) => {
    if (error) throw error;
    budget.add(chunk.byteLength);
    parts.push(chunk);
  });
  for (const [name, chunks] of files) {
    const entry = new ZipDeflate(name, { level: 6 });
    zip.add(entry);
    for (const chunk of chunks) entry.push(chunk, false);
    entry.push(new Uint8Array(), true);
  }
  zip.end();
  return new Blob(parts, { type: "application/zip" });
}
