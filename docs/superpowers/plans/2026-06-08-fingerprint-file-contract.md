# Fingerprint File Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Doraemon's server-side skill fingerprint use the same text-file set as `dt-skill`, and ensure schema migration runs before `/api/v1/resolve` queries the skill model.

**Architecture:** Keep the existing path-aware SHA256 formula. Add a focused server-side predicate that mirrors the CLI text-file contract: exclude hidden path segments, include allowlisted text extensions, and include extensionless files only when stored as non-binary. Call storage readiness before the first `SkillsItem` query in `resolveFingerprint`.

**Tech Stack:** Egg.js service, Sequelize models, Node.js `crypto`, Node.js test runner.

---

### Task 1: Lock the fingerprint file-set contract

**Files:**
- Modify: `test/clawhub-contract.test.js`
- Modify: `app/service/clawhub.js`

- [ ] Add a failing contract test proving binary assets, hidden paths, and unsupported extensions do not change the fingerprint, while extensionless text files do.
- [ ] Run `fnm exec --using=18 node --test test/clawhub-contract.test.js` and confirm the new assertion fails.
- [ ] Add a server-side `shouldIncludeFingerprintFile` predicate and filter records before hashing.
- [ ] Re-run the contract test and confirm it passes.

### Task 2: Run migration before resolve queries

**Files:**
- Modify: `test/clawhub-contract.test.js`
- Modify: `app/service/clawhub.js`

- [ ] Add a failing test recording `migrate` before `query`.
- [ ] Run the contract test and confirm the observed order is currently `query`.
- [ ] Call `ensureStorageReady()` at the start of `resolveFingerprint`.
- [ ] Re-run the contract test and confirm `migrate, query`.

### Task 3: Regression verification

**Files:**
- Verify only.

- [ ] Run all Clawhub and Skills backend tests under Node 18.
- [ ] Run `git diff --check`.
- [ ] Review the final diff and confirm P2 sorting code is unchanged.
