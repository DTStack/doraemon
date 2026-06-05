const test = require('node:test');
const assert = require('node:assert/strict');

const GitHubStarsClient = require('../app/utils/github-stars');

test('extractGitHubRepoFullName parses SSH git@github.com URLs', () => {
    const client = new GitHubStarsClient();
    assert.equal(client.extractGitHubRepoFullName('git@github.com:anthropics/claude-code.git'), 'anthropics/claude-code');
    assert.equal(client.extractGitHubRepoFullName('git@github.com:owner/repo'), 'owner/repo');
});

test('extractGitHubRepoFullName parses HTTPS github.com URLs', () => {
    const client = new GitHubStarsClient();
    assert.equal(client.extractGitHubRepoFullName('https://github.com/facebook/react'), 'facebook/react');
    assert.equal(client.extractGitHubRepoFullName('https://github.com/owner/repo.git'), 'owner/repo');
    assert.equal(client.extractGitHubRepoFullName('http://github.com/owner/repo'), 'owner/repo');
});

test('extractGitHubRepoFullName returns empty for non-GitHub URLs', () => {
    const client = new GitHubStarsClient();
    assert.equal(client.extractGitHubRepoFullName('https://gitlab.com/owner/repo'), '');
    assert.equal(client.extractGitHubRepoFullName(''), '');
    assert.equal(client.extractGitHubRepoFullName('not-a-url'), '');
});

test('parseCompactNumber handles plain numbers', () => {
    const client = new GitHubStarsClient();
    assert.equal(client.parseCompactNumber('42'), 42);
    assert.equal(client.parseCompactNumber('1,234'), 1234);
    assert.equal(client.parseCompactNumber('0'), 0);
});

test('parseCompactNumber handles compact suffixes', () => {
    const client = new GitHubStarsClient();
    assert.equal(client.parseCompactNumber('1.5k'), 1500);
    assert.equal(client.parseCompactNumber('2m'), 2000000);
    assert.equal(client.parseCompactNumber('3b'), 3000000000);
});

test('parseCompactNumber returns null for invalid input', () => {
    const client = new GitHubStarsClient();
    assert.equal(client.parseCompactNumber(''), null);
    assert.equal(client.parseCompactNumber('abc'), null);
    assert.equal(client.parseCompactNumber(null), null);
});

test('extractStarsFromGitHubHtml extracts stars from title attribute', () => {
    const client = new GitHubStarsClient();
    const html = '<span id="repo-stars-counter-star" title="1,234">1.2k</span>';
    assert.equal(client.extractStarsFromGitHubHtml(html), 1234);
});

test('extractStarsFromGitHubHtml extracts stars from aria-label', () => {
    const client = new GitHubStarsClient();
    const html = '<span id="repo-stars-counter-star" aria-label="5,000 stars">5k</span>';
    assert.equal(client.extractStarsFromGitHubHtml(html), 5000);
});

test('extractStarsFromGitHubHtml extracts stars from text content', () => {
    const client = new GitHubStarsClient();
    const html = '<span id="repo-stars-counter-star">42</span>';
    assert.equal(client.extractStarsFromGitHubHtml(html), 42);
});

test('extractStarsFromGitHubHtml returns null for missing element', () => {
    const client = new GitHubStarsClient();
    assert.equal(client.extractStarsFromGitHubHtml('<html></html>'), null);
    assert.equal(client.extractStarsFromGitHubHtml(''), null);
});

test('fetchByRepoUrl returns null for non-GitHub URLs', async () => {
    const client = new GitHubStarsClient();
    const result = await client.fetchByRepoUrl('https://gitlab.com/owner/repo');
    assert.equal(result, null);
});

test('fetchByRepoUrl returns null for empty input', async () => {
    const client = new GitHubStarsClient();
    const result = await client.fetchByRepoUrl('');
    assert.equal(result, null);
});
