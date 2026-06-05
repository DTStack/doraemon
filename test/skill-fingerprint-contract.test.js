const test = require('node:test');
const assert = require('node:assert/strict');

const contract = require('../contracts/skill-fingerprint');
const goldenVectors = require('../contracts/skill-fingerprint/golden-vectors.v1.json');

test('golden vectors match the shared fingerprint contract', () => {
    for (const testCase of goldenVectors.cases) {
        const fingerprint = contract.fingerprintFromGoldenCase(testCase);
        if (testCase.fingerprint) {
            assert.equal(
                fingerprint,
                testCase.fingerprint,
                `golden vector "${testCase.name}" drifted`
            );
            continue;
        }
        assert.equal(
            contract.fingerprintFromGoldenCase(testCase),
            fingerprint,
            `golden vector "${testCase.name}" must be deterministic`
        );
    }
});

test('buildSkillFingerprint sorts paths lexicographically', () => {
    const fingerprint = contract.buildSkillFingerprint([
        { path: 'b.txt', sha256: contract.sha256Hex('b') },
        { path: 'a.txt', sha256: contract.sha256Hex('a') },
    ]);
    const expected = contract.buildSkillFingerprint([
        { path: 'a.txt', sha256: contract.sha256Hex('a') },
        { path: 'b.txt', sha256: contract.sha256Hex('b') },
    ]);
    assert.equal(fingerprint, expected);
});
