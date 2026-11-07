// Adapt the pinned Emscripten glue without rebuilding or modifying its WASM.
// Keep these source changes available alongside the LGPL CAD assets.
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { build } from "esbuild";

export function adaptCADGlue(source) {
  function replace(from, to) {
    if (source.split(from).length !== 2)
      throw new Error("Unexpected occt-import-js glue; review CAD adapter");
    source = source.replace(from, to);
  }
  function replaceSection(start, end, replacement) {
    const a = source.indexOf(start),
      b = source.indexOf(end, a);
    if (a < 0 || b <= a) throw new Error("Missing Emscripten binding section");
    replace(source.slice(a, b), replacement);
  }
  // The upstream package generates two binding functions with Function().
  // Equivalent closures allow script-src 'self' 'wasm-unsafe-eval', without
  // enabling JavaScript eval. This build exports synchronous functions only.
  replaceSection(
    "function newFunc(",
    "var ensureOverloadTable=",
    `
function craftInvokerFunction(humanName, argTypes, classType, invoker, target, isAsync) {
  if (isAsync || argTypes.length < 2) throw new Error('Unsupported CAD binding');
  const isMethod = argTypes[1] !== null && classType !== null;
  const usesStack = usesDestructorStack(argTypes);
  return createNamedFunction(humanName, function (...args) {
    const stack = usesStack ? [] : null, cleanup = [], wired = [target];
    let result;
    function convert(type, value) {
      const converted = type.toWireType(stack, value);
      if (!usesStack && type.destructorFunction) cleanup.push([type.destructorFunction, converted]);
      return converted;
    }
    try {
      if (isMethod) wired.push(convert(argTypes[1], this));
      for (let i = 2; i < argTypes.length; i++) wired.push(convert(argTypes[i], args[i - 2]));
      result = invoker(...wired);
    } finally {
      if (stack) runDestructors(stack);
      else for (const [destroy, value] of cleanup) destroy(value);
    }
    if (!argTypes[0].isVoid) return argTypes[0].fromWireType(result);
  });
}
`,
  );
  replaceSection(
    "var __emval_get_method_caller=",
    "var __emval_get_property=",
    `
var __emval_get_method_caller = (argCount, argTypes, kind) => {
  const types = emval_lookupTypes(argCount, argTypes), retType = types.shift();
  if (kind !== 0 && kind !== 1) throw new Error('Unsupported CAD method binding');
  return emval_addMethodCaller(function (obj, func, destructorsRef, pointer) {
    const args = [];
    for (const type of types) {
      args.push(type.readValueFromPointer(pointer));
      pointer += type.argPackAdvance;
    }
    const result = kind === 1 ? Reflect.construct(func, args) : func.apply(obj, args);
    if (!retType.isVoid) return emval_returnValue(retType, destructorsRef, result);
  });
};
`,
  );
  replace(
    "var getHeapMax=()=>2147483648;",
    'var getHeapMax=()=>Math.min(2147483648,Module["viewstlMaxHeapBytes"]||2147483648);',
  );
  if (source.includes("newFunc(Function"))
    throw new Error("CAD glue still requires eval");
  return source;
}

export async function buildCAD(out) {
  const pkg = "node_modules/occt-import-js";
  const metadata = JSON.parse(await readFile(`${pkg}/package.json`, "utf8"));
  if (metadata.version !== "0.0.23")
    throw new Error("Review CAD glue for updated dependency");
  await mkdir(`${out}/cad`, { recursive: true });
  const source = adaptCADGlue(
    await readFile(`${pkg}/dist/occt-import-js.js`, "utf8"),
  );
  await build({
    stdin: {
      contents: source,
      sourcefile: "occt-import-js.cjs",
      resolveDir: process.cwd(),
    },
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
    define: { process: "undefined" },
    external: ["fs", "path", "crypto"],
    outfile: `${out}/cad/occt-import-js.js`,
  });
  await copyFile(
    `${pkg}/dist/occt-import-js.wasm`,
    `${out}/cad/occt-import-js.wasm`,
  );
  // Ship the glue source and exact adaptation recipe for inspection/replacement.
  await writeFile(`${out}/cad/occt-import-js.source.txt`, source);
  await copyFile(
    "scripts/prepare-cad.mjs",
    `${out}/cad/prepare-cad.source.txt`,
  );
}
