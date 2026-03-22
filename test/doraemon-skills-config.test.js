const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const cliLib = require('../scripts/doraemon-skills-lib');

test('resolveServer falls back to bootstrap-written config when option and env are absent', () => {
    assert.equal(typeof cliLib.resolveServer, 'function');
    assert.equal(typeof cliLib.readBootstrapConfigServer, 'function');

    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'doraemon-cli-home-'));
    const configDir = path.join(tempHome, '.doraemon');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
        path.join(configDir, 'skills.json'),
        JSON.stringify({ server: 'https://doraemon.example.com' }),
        'utf8'
    );

    const server = cliLib.resolveServer({}, {
        env: {},
        homedir: () => tempHome,
    });

    assert.equal(server, 'https://doraemon.example.com/');
});

test('buildInstallMetaUrl queries install-meta with installKey instead of exposing slug semantics', () => {
    assert.equal(typeof cliLib.buildInstallMetaUrl, 'function');

    const metaUrl = cliLib.buildInstallMetaUrl('https://doraemon.example.com', 'skill-creator');

    assert.equal(metaUrl.toString(), 'https://doraemon.example.com/api/skills/install-meta?installKey=skill-creator');
    assert.equal(metaUrl.searchParams.get('installKey'), 'skill-creator');
    assert.equal(metaUrl.searchParams.get('slug'), null);
});
