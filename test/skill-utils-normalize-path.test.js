const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeRelativePath } = require('../app/utils/skill-utils');

// This is the path-traversal guard that getSkillFileContent, buildSkillZip,
// and the upload flow all rely on. If it drifts, all three defenses rot at
// once — so pin its behavior here.
test('normalizeRelativePath rejects traversal and accepts clean relative paths', () => {
    assert.equal(normalizeRelativePath('SKILL.md'), 'SKILL.md');
    assert.equal(normalizeRelativePath('docs/readme.md'), 'docs/readme.md');
    assert.equal(normalizeRelativePath(' ./a/b.md '), 'a/b.md');
    assert.equal(normalizeRelativePath('a\\b.md'), 'a/b.md');

    assert.equal(normalizeRelativePath(''), null);
    assert.equal(normalizeRelativePath(null), null);
    assert.equal(normalizeRelativePath(undefined), null);
    assert.equal(normalizeRelativePath('../etc/passwd'), null);
    assert.equal(normalizeRelativePath('..'), null);
    assert.equal(normalizeRelativePath('.'), null);
});

// Known gap: an absolute Unix path like /etc/passwd has its leading slash
// stripped by path.normalize and slips through as "etc/passwd". None of the
// current callers feed absolute paths in, so it is not blocking — flagged
// here so a future hardening of normalizeRelativePath makes this green.
test('normalizeRelativePath currently passes absolute paths through (known gap)', () => {
    assert.equal(normalizeRelativePath('/etc/passwd'), 'etc/passwd');
});
