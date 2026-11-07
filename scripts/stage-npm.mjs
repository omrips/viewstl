// Build and validate first. Stage the same self-contained distribution under
// both public names; no wrapper dependency or runtime path changes are needed.
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
if (pkg.name !== 'viewstl') throw new Error('Expected the canonical viewstl package');
const results = join(root, 'test-results');
await mkdir(results, { recursive: true });
const output = await mkdtemp(join(results, `npm-${pkg.version}-`));
const readme = await readFile(join(root, 'README.md'), 'utf8');
const packages = [];
for (const name of ['viewstl', '@omrips/viewstl']) {
  const directory = join(output, name === 'viewstl' ? 'viewstl' : 'scoped');
  await mkdir(directory);
  for (const file of new Set([...pkg.files, 'LICENSE'])) {
    const source = resolve(root, file);
    if (!source.startsWith(root + sep)) throw new Error(`Invalid package path: ${file}`);
    await cp(source, join(directory, file), { recursive: true });
  }
  // Source-only build scripts and development dependencies are not needed in
  // a staged, already-built distribution. In particular, do not run prepack here.
  const { scripts, devDependencies, ...metadata } = pkg;
  await writeFile(join(directory, 'package.json'), JSON.stringify({ ...metadata, name }, null, 2) + '\n');
  const note = name === 'viewstl' ? '' :
    '> This is the maintained `@omrips/viewstl` package. The shorter `npm install viewstl` installs the same plugin. Existing `@omrips/viewstl` and `@omrips/viewstl/node` imports remain supported.\n\n';
  await writeFile(join(directory, 'README.md'), note + readme);
  packages.push({ name, version: pkg.version, directory });
}
console.log(JSON.stringify({ output, packages }, null, 2));
