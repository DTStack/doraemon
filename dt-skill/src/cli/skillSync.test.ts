import { describe, expect, it } from 'vitest';

import { decideSkillSync, remoteCurrentFromDetail } from './skillSync.js';

describe('remoteCurrentFromDetail', () => {
    it('prefers skill.fingerprint only', () => {
        const remote = remoteCurrentFromDetail({
            skill: { fingerprint: 'aaa', version: '0.0.0' },
            latestVersion: { fingerprint: 'bbb', version: '1.0.0' },
        });
        expect(remote.fingerprint).toBe('aaa');
        expect(remote.version).toBe('0.0.0');
    });

    it('falls back to latestVersion.version when skill has no version', () => {
        const remote = remoteCurrentFromDetail({
            skill: { fingerprint: 'aaa', version: null },
            latestVersion: { version: '2.0.0' },
        });
        expect(remote.version).toBe('2.0.0');
        expect(remote.fingerprint).toBe('aaa');
    });
});

describe('decideSkillSync', () => {
    it('up_to_date when hashes match', () => {
        expect(
            decideSkillSync({
                localFingerprint: 'same',
                remote: { fingerprint: 'same', version: '0.0.0' },
            })
        ).toEqual({ action: 'up_to_date', version: '0.0.0', fingerprint: 'same' });
    });

    it('update when hashes differ', () => {
        expect(
            decideSkillSync({
                localFingerprint: 'old',
                remote: { fingerprint: 'new', version: '0.0.0' },
            })
        ).toEqual({ action: 'update', version: '0.0.0', fingerprint: 'new' });
    });

    it('missing when remote has neither version nor fingerprint', () => {
        expect(
            decideSkillSync({
                localFingerprint: 'x',
                remote: { fingerprint: null, version: null },
            })
        ).toEqual({ action: 'missing' });
    });

    it('explicitVersion is a side door to update', () => {
        expect(
            decideSkillSync({
                localFingerprint: 'same',
                remote: { fingerprint: 'same', version: '0.0.0' },
                explicitVersion: '9.9.9',
            })
        ).toEqual({ action: 'update', version: '9.9.9', fingerprint: 'same' });
    });

    it('update when local missing but remote present', () => {
        expect(
            decideSkillSync({
                localFingerprint: null,
                remote: { fingerprint: 'new', version: '0.0.0' },
            })
        ).toEqual({ action: 'update', version: '0.0.0', fingerprint: 'new' });
    });
});
