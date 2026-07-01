/* @vitest-environment node */

import { describe, expect, it } from 'vitest';

import { parseArk } from './ark';
import { ApiV1SearchResponseSchema, ApiV1SkillResponseSchema, ClawdisSkillMetadataSchema } from './schemas';

describe('dt-skill skill metadata schema', () => {
    it('preserves optional env var declarations', () => {
        const parsed = parseArk(
            ClawdisSkillMetadataSchema,
            {
                envVars: [
                    { name: 'TODOIST_API_KEY', required: true, description: 'API token' },
                    { name: 'TODOIST_PROJECT_ID', required: false, description: 'Default project' },
                ],
            },
            'Skill metadata'
        );

        expect(parsed.envVars?.[1]).toEqual({
            name: 'TODOIST_PROJECT_ID',
            required: false,
            description: 'Default project',
        });
    });

    it('parses v1 search owner metadata', () => {
        const parsed = parseArk(
            ApiV1SearchResponseSchema,
            {
                results: [
                    {
                        slug: 'demo',
                        displayName: 'Demo',
                        summary: null,
                        version: '1.0.0',
                        score: 1,
                        ownerHandle: 'openclaw',
                        owner: {
                            handle: 'openclaw',
                            displayName: 'OpenClaw',
                            image: null,
                        },
                    },
                ],
            },
            'Search'
        );

        expect(parsed.results[0]?.ownerHandle).toBe('openclaw');
        expect(parsed.results[0]?.owner?.displayName).toBe('OpenClaw');
    });

    it('parses a package skill with typed children', () => {
        const parsed = parseArk(
            ApiV1SkillResponseSchema,
            {
                skill: {
                    slug: 'bundle',
                    displayName: 'Bundle',
                    summary: null,
                    tags: [],
                    stats: {},
                    createdAt: 1,
                    updatedAt: 1,
                    isPackage: true,
                    parentSlug: null,
                    children: [
                        { slug: 'child-a', displayName: 'A', summary: 'a summary', version: '1.0.0' },
                        { slug: 'child-b', displayName: null, summary: null, version: null },
                    ],
                },
                latestVersion: null,
                owner: null,
                moderation: null,
            },
            'Skill'
        );

        expect(parsed.skill?.isPackage).toBe(true);
        expect(parsed.skill?.children?.map((c) => c.slug)).toEqual(['child-a', 'child-b']);
        expect(parsed.skill?.children?.[0]?.displayName).toBe('A');
    });
});
