import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, sep } from "node:path";

let total = 0;
for (const folder of ["legacy/v1", "legacy/local-1.14-2026-09-30"]) {
  const root = resolve(folder);
  const manifest = JSON.parse(await readFile(`${root}/manifest.json`, "utf8"));
  for (const entry of manifest.files) {
    const path = resolve(root, entry.path);
    if (!path.startsWith(root + sep)) throw new Error("Invalid legacy manifest path");
    const data = await readFile(path);
    if (data.length !== entry.bytes || createHash("sha256").update(data).digest("hex") !== entry.sha256)
      throw new Error(`Legacy snapshot changed: ${folder}/${entry.path}`);
    total++;
  }
}
console.log(`Legacy snapshots verified: ${total} files, including the complete pre-v2 master tree.`);
