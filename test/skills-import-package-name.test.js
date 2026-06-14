const test = require('node:test');
const assert = require('node:assert/strict');

const skillsModule = require('../app/service/skills');

test('isLikelyBinary treats invalid UTF-8 as binary so original bytes are preserved', () => {
    const service = Object.create(skillsModule.prototype);

    assert.equal(service.isLikelyBinary(Buffer.from('valid utf8', 'utf8')), false);
    assert.equal(service.isLikelyBinary(Buffer.from([0xff, 0xfe, 0xfd])), true);
    assert.equal(service.isLikelyBinary(Buffer.from([0x61, 0x00, 0x62])), true);
});

test('isLikelyBinary does not reject valid UTF-8 split at the 4096-byte sample boundary', () => {
    const service = Object.create(skillsModule.prototype);
    const prefix = 'a'.repeat(4094);
    const buffer = Buffer.from(`${prefix}答后续内容`, 'utf8');

    assert.equal(buffer.subarray(0, 4096).toString('hex').endsWith('e7ad'), true);
    assert.equal(service.isLikelyBinary(buffer), false);
});

test('getUploadIdentityKey returns preferredName when provided', () => {
    const result = skillsModule.prototype.getUploadIdentityKey(
        [{ name: 'skill-a' }, { name: 'skill-b' }],
        'my-package'
    );
    assert.equal(result, 'my-package');
});

test('getUploadIdentityKey returns empty string when no preferredName', () => {
    const result = skillsModule.prototype.getUploadIdentityKey(
        [{ name: 'skill-b' }, { name: 'skill-a' }],
        ''
    );
    assert.equal(result, '',
        'Without preferredName, should return empty string to keep package name clean');
});

test('buildUploadSourceMeta with packageName as identityKey produces readable sourceKey', () => {
    const meta = skillsModule.prototype.buildUploadSourceMeta(
        'demo-multi-skill-folders.zip',
        'demo-multi-skill-folders'
    );
    assert.ok(meta.sourceUrl.includes('demo-multi-skill-folders'));
    assert.equal(meta.repoHost, 'upload');
    assert.equal(meta.sourceType, 'upload');
});

test('buildUploadSourceMeta produces clean repoPath with or without packageName', () => {
    const withPackage = skillsModule.prototype.buildUploadSourceMeta(
        'demo-multi-skill-folders.zip',
        'demo-multi-skill-folders'
    );
    const withoutPackage = skillsModule.prototype.buildUploadSourceMeta(
        'skills-batch.zip',
        ''
    );
    assert.equal(withPackage.repoPath, 'demo-multi-skill-folders',
        'With packageName, repoPath should equal packageName');
    assert.equal(withoutPackage.repoPath, 'skills-batch',
        'Without packageName, repoPath should equal zip filename');
});

test('persistSkillsForSource accepts preferredPackageName parameter', () => {
    const fnStr = skillsModule.prototype.persistSkillsForSource.toString();
    assert.ok(
        fnStr.includes('preferredPackageName'),
        'persistSkillsForSource should have preferredPackageName parameter'
    );
});

test('importSkillFile multi-skill upload uses clean zip filename as package name (BUG)', () => {
    const service = Object.create(skillsModule.prototype);
    service.sanitizeSlugSegment = skillsModule.prototype.sanitizeSlugSegment;
    service.hashString = skillsModule.prototype.hashString;

    // Simulate web upload: no packageName, no skillName (multi-skill requires empty)
    const fileName = 'test-skill-package.zip';
    const packageName = '';
    const skillName = '';
    const identityKey = packageName || skillName; // ''

    // First build: used for buildSkillSlug
    const parsedSource = service.buildUploadSourceMeta(fileName, identityKey);
    assert.equal(parsedSource.repoPath, 'test-skill-package',
        'First build should have clean repoPath from filename');

    // Skill records from discoverSkillDirs + prepareSkillRecord
    const skillRecords = [{ name: 'web-scraper' }, { name: 'api-tester' }];

    // Second build: used for upsertSourceRecord and persistSkillsForSource
    // This is where the bug manifests
    const uploadSourceMeta = service.buildUploadSourceMeta(
        fileName,
        service.getUploadIdentityKey(skillRecords, identityKey)
    );

    // BUG: currently produces 'test-skill-package-api-tester-web-scraper-b0c3619b'
    // EXPECTED: 'test-skill-package' (just the filename, readable)
    assert.equal(uploadSourceMeta.repoPath, 'test-skill-package',
        `Package name should be clean zip filename, got: ${uploadSourceMeta.repoPath}`);
});

test('importSkillFile single-skill upload with custom name uses name in repoPath', () => {
    const service = Object.create(skillsModule.prototype);
    service.sanitizeSlugSegment = skillsModule.prototype.sanitizeSlugSegment;
    service.hashString = skillsModule.prototype.hashString;

    const fileName = 'my-skill.zip';
    const skillName = 'custom-skill-name';
    const identityKey = skillName;

    const skillRecords = [{ name: 'custom-skill-name' }];

    const uploadSourceMeta = service.buildUploadSourceMeta(
        fileName,
        service.getUploadIdentityKey(skillRecords, identityKey)
    );

    assert.equal(uploadSourceMeta.repoPath, 'custom-skill-name',
        'Single-skill upload with custom name should use name as repoPath');
});

test('importSkillFile CLI upload with packageName uses packageName as repoPath', () => {
    const service = Object.create(skillsModule.prototype);
    service.sanitizeSlugSegment = skillsModule.prototype.sanitizeSlugSegment;
    service.hashString = skillsModule.prototype.hashString;

    const fileName = 'skills-batch.zip';
    const packageName = 'my-awesome-pack';
    const identityKey = packageName;

    const skillRecords = [{ name: 'skill-a' }, { name: 'skill-b' }];

    const uploadSourceMeta = service.buildUploadSourceMeta(
        fileName,
        service.getUploadIdentityKey(skillRecords, identityKey)
    );

    assert.equal(uploadSourceMeta.repoPath, 'my-awesome-pack',
        'CLI upload with packageName should use packageName as repoPath');
});
