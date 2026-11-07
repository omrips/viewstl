import { build } from "esbuild";
import {
  mkdir,
  copyFile,
  readFile,
  writeFile,
  readdir,
  unlink,
} from "node:fs/promises";
import { resolve, sep } from "node:path";
import { buildCAD } from "./prepare-cad.mjs";
const out = "build";
await mkdir(out, { recursive: true });
const chunks = resolve(out, "chunks");
if (!chunks.startsWith(resolve(out) + sep))
  throw new Error("Invalid build directory");
for (const name of await readdir(chunks).catch(() => []))
  if (/^[\w-]+\.js$/.test(name)) await unlink(resolve(chunks, name));
const common = {
  bundle: true,
  target: "es2022",
  platform: "browser",
  legalComments: "eof",
  logLevel: "warning",
};
await build({
  ...common,
  entryPoints: ["src/index.js"],
  format: "esm",
  outfile: `${out}/viewstl.js`,
});
await build({
  ...common,
  entryPoints: ["src/commonjs.js"],
  format: "cjs",
  outfile: `${out}/viewstl.cjs`,
});
await build({
  ...common,
  entryPoints: ["src/browser.js"],
  format: "iife",
  minify: true,
  outfile: `${out}/stl_viewer.min.js`,
});
await copyFile(`${out}/stl_viewer.min.js`, `${out}/viewstl.min.js`);
await build({
  ...common,
  entryPoints: { "viewstl.worker": "src/worker.js" },
  format: "esm",
  splitting: true,
  minify: true,
  outdir: out,
  chunkNames: "chunks/[name]-[hash]",
});
await copyFile("src/viewstl.d.ts", `${out}/viewstl.d.ts`);
await copyFile("src/viewstl.d.ts", `${out}/viewstl.d.cts`);
await buildCAD(out);
// The server adapter shares parser/check implementations, without the renderer.
for (const [entry, format, filename] of [
  ["index.js", "esm", "index.js"],
  ["commonjs.js", "cjs", "index.cjs"],
  ["analysis-worker.js", "esm", "analysis-worker.js"],
]) {
  await build({
    ...common,
    platform: "node",
    target: "node20",
    entryPoints: [`src/node/${entry}`],
    format,
    outfile: `${out}/node/${filename}`,
  });
}
await copyFile("src/node/index.d.ts", `${out}/node/index.d.ts`);
await copyFile("src/node/index.d.ts", `${out}/node/index.d.cts`);
const notices = [];
for (const [name, path] of [
  ["fflate", "node_modules/fflate/LICENSE"],
  ["saxes", "third-party/saxes.LICENSE"],
  ["xmlchars", "third-party/xmlchars.LICENSE"],
  [
    "occt-import-js 0.0.23 (LGPL-2.1; optional STEP/IGES worker)",
    "node_modules/occt-import-js/dist/license.occt-import-js.txt",
  ],
  [
    "Open CASCADE Technology (optional STEP/IGES worker)",
    "node_modules/occt-import-js/dist/license.occt.txt",
  ],
]) {
  const text = await readFile(path, "utf8");
  notices.push(`${name}\n${text}`);
}
await writeFile(
  "THIRD-PARTY-NOTICES.txt",
  "ViewSTL optional archive/CAD worker dependencies (not loaded for STL/OBJ).\n\n" +
    "CAD source (npm 0.0.23): https://github.com/kovacsv/occt-import-js/tree/c2148e54b456b571238d35cac037d304053d64b2\n" +
    "Open CASCADE source: https://github.com/Open-Cascade-SAS/OCCT/tree/d2abb6d844231cb8f29be6894440874a4700e4a5\n" +
    "ViewSTL changes (2026-10-01): static Emscripten binding closures and a per-import heap ceiling.\n" +
    "The WASM binary is unmodified. Adapted glue and adaptation recipe are in cad/*.source.txt.\n\n" +
    notices.join("\n\n") +
    "\n",
);
await copyFile("THIRD-PARTY-NOTICES.txt", `${out}/THIRD-PARTY-NOTICES.txt`);
console.log(
  "Built browser distributions, Node analysis API/worker, and TypeScript declarations in build/.",
);
