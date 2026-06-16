/* @vitest-environment node */

import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const packageRoot = resolve(import.meta.dirname, '..');
const repoRoot = resolve(packageRoot, '..', '..');
const binPath = join(packageRoot, 'bin', 'dt-skill.js');
const distCliPath = join(packageRoot, 'dist', 'cli.js');

const tempDirs: string[] = [];

async function makeTmpDir(prefix: string) {
    const dir = await mkdtemp(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
}

function runNode(args: string[], envOverrides: NodeJS.ProcessEnv = {}) {
    const { FORCE_COLOR: _forceColor, ...env } = process.env;
    return spawnSync('node', args, {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...env, ...envOverrides },
    });
}

afterEach(async () => {
    while (tempDirs.length > 0) {
        await rm(tempDirs.pop()!, { recursive: true, force: true });
    }
});

describe('built CLI artifact', () => {
    it('runs help from the published bin entrypoint', async () => {
        const result = runNode([binPath, '--help']);

        expect(result.status).toBe(0);
        expect(result.stderr).toBe('');
        expect(result.stdout).toContain('dt-skill CLI');
    });

    it('loads the fingerprint contract from the built package', async () => {
        const isolatedPackage = await makeTmpDir('dt-skill-artifact-package-');
        await cp(join(packageRoot, 'bin'), join(isolatedPackage, 'bin'), { recursive: true });
        await cp(join(packageRoot, 'dist'), join(isolatedPackage, 'dist'), { recursive: true });
        await cp(join(packageRoot, 'package.json'), join(isolatedPackage, 'package.json'));

        const result = spawnSync(
            'node',
            [
                '--input-type=module',
                '--eval',
                `import('${join(isolatedPackage, 'dist/schema/skillFingerprintContract.js').replaceAll('\\', '\\\\')}')`,
            ],
            { encoding: 'utf8' }
        );

        expect(result.status).toBe(0);
        expect(result.stderr).toBe('');
    });

    it('keeps the built dist free of compiled test files', async () => {
        expect(dirname(distCliPath)).toBe(join(packageRoot, 'dist'));
        const result = runNode([
            '--input-type=module',
            '--eval',
            `import { readdir } from 'node:fs/promises';
       import { join } from 'node:path';
       const queue = ['${join(packageRoot, 'dist').replaceAll('\\', '\\\\')}'];
       const hits = [];
       while (queue.length > 0) {
         const dir = queue.pop();
         for (const entry of await readdir(dir, { withFileTypes: true })) {
           const path = join(dir, entry.name);
           if (entry.isDirectory()) queue.push(path);
           else if (entry.name.includes('.test.')) hits.push(path);
         }
       }
       if (hits.length > 0) {
         console.error(hits.join('\\n'));
         process.exit(1);
       }`,
        ]);

        expect(result.status).toBe(0);
        expect(result.stderr).toBe('');
    });
});
