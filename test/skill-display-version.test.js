const test = require('node:test');
const assert = require('node:assert/strict');

const {
    extractSkillMdVersion,
    extractMetadataJsonVersion,
    resolveSkillDisplayVersion,
} = require('../app/utils/skill-utils');

test('extractSkillMdVersion prefers metadata.version over top-level version', () => {
    const skillMd = [
        '---',
        'name: demo',
        'version: 0.1.0',
        'metadata:',
        '  author: shane',
        '  version: "1.2.0"',
        '---',
        'body',
    ].join('\n');
    assert.equal(extractSkillMdVersion(skillMd), '1.2.0');
});

test('extractSkillMdVersion reads top-level version', () => {
    assert.equal(extractSkillMdVersion('---\nname: demo\nversion: 0.3.0\n---\nbody'), '0.3.0');
    assert.equal(extractSkillMdVersion('---\nname: demo\n---\nbody'), '');
    assert.equal(extractSkillMdVersion('no frontmatter'), '');
});

test('extractMetadataJsonVersion reads version and ignores invalid json', () => {
    assert.equal(extractMetadataJsonVersion('{"version":"2.0.1"}'), '2.0.1');
    assert.equal(extractMetadataJsonVersion('{"version":3}'), '3');
    assert.equal(extractMetadataJsonVersion('{"name":"x"}'), '');
    assert.equal(extractMetadataJsonVersion('not json'), '');
    assert.equal(extractMetadataJsonVersion(''), '');
});

test('resolveSkillDisplayVersion follows metadata.json > frontmatter > revision', () => {
    const skillMd = '---\nname: demo\nversion: 0.3.0\n---\nbody';
    assert.deepEqual(
        resolveSkillDisplayVersion({
            metadataJson: '{"version":"2.0.1"}',
            skillMd,
            publishRevision: 4,
        }),
        { version: '2.0.1', source: 'metadata.json' }
    );
    assert.deepEqual(
        resolveSkillDisplayVersion({ metadataJson: '', skillMd, publishRevision: 4 }),
        {
            version: '0.3.0',
            source: 'frontmatter',
        }
    );
    assert.deepEqual(
        resolveSkillDisplayVersion({ metadataJson: '', skillMd: 'body', publishRevision: 4 }),
        { version: '4', source: 'revision' }
    );
});
