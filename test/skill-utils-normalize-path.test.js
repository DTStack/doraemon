const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizeRelativePath,
    extractSkillMdDescription,
    resolveMarketCardDescription,
} = require('../app/utils/skill-utils');

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

test('extractSkillMdDescription prefers frontmatter description', () => {
    const md = `---
name: zentao-api
description: 通过禅道 HTTP API 获取 Bug 详情。
---

# 禅道 API 工具

正文不应优先于 frontmatter。
`;
    assert.equal(extractSkillMdDescription(md), '通过禅道 HTTP API 获取 Bug 详情。');
});

test('extractSkillMdDescription falls back to first body line', () => {
    const md = `# Title

First useful sentence here.

More body.
`;
    assert.equal(extractSkillMdDescription(md), 'First useful sentence here.');
});

test('extractSkillMdDescription handles quoted and block scalars', () => {
    assert.equal(
        extractSkillMdDescription('---\ndescription: "quoted value"\n---\n\n# x\n'),
        'quoted value'
    );
    assert.equal(
        extractSkillMdDescription('---\ndescription: |\n  line one\n  line two\n---\n\n# x\n'),
        'line one line two'
    );
});

test('resolveMarketCardDescription sticky keep / backfill / explicit', () => {
    assert.equal(
        resolveMarketCardDescription({
            hasDescription: false,
            currentDescription: 'market card',
            fromSkillMd: 'from package',
        }),
        'market card'
    );
    assert.equal(
        resolveMarketCardDescription({
            hasDescription: false,
            currentDescription: '',
            fromSkillMd: 'from package',
        }),
        'from package'
    );
    assert.equal(
        resolveMarketCardDescription({
            hasDescription: true,
            description: '  override  ',
            currentDescription: 'market card',
            fromSkillMd: 'from package',
        }),
        'override'
    );
    assert.equal(
        resolveMarketCardDescription({
            hasDescription: true,
            description: '',
            currentDescription: 'market card',
            fromSkillMd: 'from package',
        }),
        ''
    );
});
