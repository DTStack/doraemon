# dt-skill update scope Implementation Plan

> **For agentic workers:** Inline execution in session (user said 开始).

**Goal:** Align `dt-skill update` scope selection with vercel-labs/skills (prompt / -g / -p / both / -y).

**Architecture:** Pure `resolveUpdateScope` + `hasProjectSkills`; `cmdUpdate` runs the existing fingerprint update loop once per selected scope (project and/or global). CLI adds `-g`/`-p` on update; detection stays content fingerprint.

**Tech Stack:** TypeScript, Commander, Vitest, existing lockfile + skillSync.

**Spec:** `docs/superpowers/specs/2026-08-03-dt-skill-update-scope-design.md`

## Tasks

1. `resolveUpdateScope` + `hasProjectSkills` + three-way `selectUpdateScope` UI  
2. Wire CLI `-g`/`-p` and multi-scope `cmdUpdate`  
3. Replace old `resolveUpdatePaths` auto-guess; fix tests  
