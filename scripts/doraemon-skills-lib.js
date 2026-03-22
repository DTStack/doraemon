const fs = require('fs');
const os = require('os');
const path = require('path');
const AdmZip = require('adm-zip');
const fetch = require('node-fetch');

function fail(message) {
    throw new Error(message);
}

function normalizeServerUrl(server) {
    if (!server) {
        fail('Server is required. Provide --server <url>, set DORAEMON_SKILLS_SERVER, or configure ~/.doraemon/skills.json.');
    }
    try {
        const parsed = new URL(server);
        return parsed.toString();
    } catch (error) {
        fail(`Invalid server URL: ${server}`);
    }
}

function parseArgs(argv) {
    const [command, ...rest] = argv;
    const options = {};
    const positionals = [];

    for (let i = 0; i < rest.length; i++) {
        const token = rest[i];
        if (token === '--server' || token === '--dir') {
            const value = rest[i + 1];
            if (!value || value.startsWith('--')) {
                fail(`Missing value for ${token}`);
            }
            options[token.slice(2)] = value;
            i += 1;
            continue;
        }
        if (token.startsWith('--')) {
            fail(`Unknown option: ${token}`);
        }
        positionals.push(token);
    }

    return {
        command,
        positionals,
        options,
    };
}

function resolveInstallRoot(dirOption) {
    const root = dirOption || './skills';
    return path.resolve(process.cwd(), root);
}

function readBootstrapConfigServer({ homedir = os.homedir } = {}) {
    const configPath = path.join(homedir(), '.doraemon', 'skills.json');
    if (!fs.existsSync(configPath)) {
        return '';
    }

    try {
        const payload = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return String(payload && payload.server ? payload.server : '').trim();
    } catch (error) {
        fail(`Invalid bootstrap config: ${configPath}`);
    }
}

function resolveServer(options = {}, { env = process.env, homedir = os.homedir } = {}) {
    const value = options.server || env.DORAEMON_SKILLS_SERVER || readBootstrapConfigServer({ homedir });
    return normalizeServerUrl(value);
}

function parseResponsePayload(payload) {
    if (!payload || typeof payload !== 'object') {
        fail('Invalid server response payload.');
    }
    if (payload.success !== true) {
        const message = payload.message || payload.msg || 'Request failed.';
        fail(message);
    }
    return payload.data;
}

async function readJsonResponse(response) {
    const raw = await response.text();
    let payload = null;
    try {
        payload = raw ? JSON.parse(raw) : null;
    } catch (error) {
        if (!response.ok) {
            fail(`Request failed with status ${response.status}.`);
        }
        fail('Invalid JSON response.');
    }
    return payload;
}

function buildInstallMetaUrl(server, installKey) {
    const metaUrl = new URL('/api/skills/install-meta', server);
    metaUrl.searchParams.set('installKey', installKey);
    return metaUrl;
}

async function requestInstallMeta(server, installKey) {
    const metaUrl = buildInstallMetaUrl(server, installKey);

    let response;
    try {
        response = await fetch(metaUrl.toString());
    } catch (error) {
        fail(`Failed to request install-meta: ${error.message}`);
    }

    const payload = await readJsonResponse(response);
    if (!response.ok) {
        const message = payload && (payload.message || payload.msg)
            ? payload.message || payload.msg
            : `Request failed with status ${response.status}.`;
        fail(message);
    }

    return parseResponsePayload(payload);
}

function findSkillRootBySkillMd(baseDir) {
    const queue = [baseDir];
    const skillMdDirs = [];

    while (queue.length) {
        const current = queue.shift();
        const entries = fs.readdirSync(current, { withFileTypes: true });
        let hasSkillMd = false;

        for (const entry of entries) {
            if (entry.isFile() && entry.name.toLowerCase() === 'skill.md') {
                hasSkillMd = true;
                break;
            }
        }
        if (hasSkillMd) {
            skillMdDirs.push(current);
            continue;
        }

        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }
            queue.push(path.join(current, entry.name));
        }
    }

    if (skillMdDirs.length === 0) {
        fail('Invalid package: SKILL.md not found.');
    }

    skillMdDirs.sort((a, b) => {
        const depthDiff = a.split(path.sep).length - b.split(path.sep).length;
        if (depthDiff !== 0) {
            return depthDiff;
        }
        return a.localeCompare(b);
    });

    return skillMdDirs[0];
}

function ensureZipBuffer(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 2) {
        fail('Download failed: package is not a zip archive.');
    }
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
        fail('Download failed: package is not a zip archive.');
    }
}

async function downloadArchive(downloadUrl) {
    let response;
    try {
        response = await fetch(downloadUrl);
    } catch (error) {
        fail(`Failed to download package: ${error.message}`);
    }

    if (!response.ok) {
        fail(`Failed to download package: HTTP ${response.status}`);
    }

    const buffer = await response.buffer();
    ensureZipBuffer(buffer);
    return buffer;
}

function extractArchive(buffer, tempDir) {
    try {
        const zip = new AdmZip(buffer);
        zip.extractAllTo(tempDir, true);
    } catch (error) {
        fail(`Failed to extract zip: ${error.message}`);
    }
}

function installFromSkillRoot(skillRoot, targetDir) {
    if (fs.existsSync(targetDir)) {
        fail(`Target directory already exists: ${targetDir}`);
    }
    fs.mkdirSync(path.dirname(targetDir), { recursive: true });
    fs.cpSync(skillRoot, targetDir, { recursive: true });
}

async function runInstall(positionals, options) {
    const installKey = positionals[0];
    if (!installKey) {
        fail('Usage: doraemon-skills install <installKey> [--server <url>] [--dir <path>]');
    }

    const server = resolveServer(options);
    const installRoot = resolveInstallRoot(options.dir);
    const meta = await requestInstallMeta(server, installKey);

    if (meta.installable === false) {
        fail(`Skill is not installable: ${meta.reason || 'unknown reason'}`);
    }
    if (meta.packageType !== 'zip') {
        fail(`Unsupported packageType: ${meta.packageType}`);
    }
    if (meta.packageRootMode !== 'find-skill-md') {
        fail(`Unsupported packageRootMode: ${meta.packageRootMode}`);
    }
    if (!meta.downloadUrl) {
        fail('install-meta missing downloadUrl.');
    }
    if (!meta.installDirName) {
        fail('install-meta missing installDirName.');
    }

    const downloadUrl = new URL(meta.downloadUrl, server).toString();
    const targetDir = path.resolve(installRoot, meta.installDirName);

    console.log(`Downloading: ${downloadUrl}`);
    const buffer = await downloadArchive(downloadUrl);

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doraemon-skills-'));
    try {
        extractArchive(buffer, tempDir);
        const skillRoot = findSkillRootBySkillMd(tempDir);
        installFromSkillRoot(skillRoot, targetDir);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    console.log(`Installed: ${meta.installKey || installKey} -> ${targetDir}`);
}

function runList(options) {
    const installRoot = resolveInstallRoot(options.dir);
    if (!fs.existsSync(installRoot)) {
        return;
    }

    const names = fs
        .readdirSync(installRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));

    for (const name of names) {
        console.log(name);
    }
}

async function main(argv = process.argv.slice(2)) {
    const { command, positionals, options } = parseArgs(argv);

    if (!command) {
        fail('Usage: doraemon-skills <install|list> ...');
    }

    if (command === 'install') {
        await runInstall(positionals, options);
        return;
    }
    if (command === 'list') {
        runList(options);
        return;
    }

    fail(`Unknown command: ${command}`);
}

module.exports = {
    buildInstallMetaUrl,
    downloadArchive,
    ensureZipBuffer,
    extractArchive,
    fail,
    findSkillRootBySkillMd,
    installFromSkillRoot,
    main,
    normalizeServerUrl,
    parseArgs,
    parseResponsePayload,
    readBootstrapConfigServer,
    readJsonResponse,
    requestInstallMeta,
    resolveInstallRoot,
    resolveServer,
    runInstall,
    runList,
};
