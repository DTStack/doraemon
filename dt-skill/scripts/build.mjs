import { spawnSync } from 'node:child_process';
import { cp, rename, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(packageRoot, 'dist');
const contractsRoot = resolve(packageRoot, '..', 'contracts');

const contractPackages = ['skill-fingerprint', 'skill-categories'];

await rm(distDir, { recursive: true, force: true });

const tscBin = require.resolve('typescript/bin/tsc');
const result = spawnSync(process.execPath, [tscBin, '-p', 'tsconfig.json'], {
    cwd: packageRoot,
    stdio: 'inherit',
});

if (result.status !== 0) {
    process.exit(result.status ?? 1);
}

for (const name of contractPackages) {
    const sourceDir = resolve(contractsRoot, name);
    const destDir = resolve(distDir, 'contracts', name);
    await cp(sourceDir, destDir, { recursive: true });
    await rename(resolve(destDir, 'index.js'), resolve(destDir, 'index.cjs'));
}
