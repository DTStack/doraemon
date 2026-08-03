# dt-skill `update` scope — product design

**Date:** 2026-08-03  
**Status:** Approved; implemented in `dt-skill` update command (2026-08-03)  
**Reference product:** [vercel-labs/skills](https://github.com/vercel-labs/skills) `skills update`  
**Out of scope for this design:** install, list, uninstall product changes; GitHub tree-hash detection

## Problem

Users can install skills into **global** scope (`~/.agents`), but `dt-skill update` historically resolved paths mainly from “project unless `--global`”. That mismatched vercel’s update UX and made global installs easy to miss or hash against the wrong tree.

## Goal

Align **`dt-skill update` only** with vercel’s **scope selection** product behavior. Keep **content fingerprint** as the update-detection signal (registry-backed), not GitHub Trees.

## Scope model (product)

Two install roots (unchanged layout):

| Scope | Root (conceptual) |
|-------|-------------------|
| **Project** | Current project’s `.agents` tree |
| **Global** | User home `.agents` tree |

**Both** is a **update-only** selection: run the update flow for project and for global as needed. Install continues to be single-scope (not part of this design).

Lock files stay at each root under the existing dt-skill layout (e.g. `.agents/.dt-skill/lock.json`). This design does **not** rename locks to vercel’s `skills-lock.json` / `.skill-lock.json`.

## Command surface (`update`)

Flags (names align with vercel):

| Flag | Meaning |
|------|---------|
| `-g` / `--global` | Update global skills only |
| `-p` / `--project` | Update project skills only |
| Both `-g` and `-p` | Both |
| `-y` / `--yes` (or non-TTY) | Skip interactive scope prompt; auto-detect (below) |

Positional skill slug(s) remain supported (single or as today allows).

### Resolution rules (must match vercel)

1. **Interactive, bare `update`, no `-g`/`-p`/`-y`:**  
   Prompt **Update scope** with three options:
   - Project — update skills in current directory  
   - Global — update skills in home directory  
   - Both — update all (both scopes)  

   This is the primary UX (same as `npx skills update` in a TTY).

2. **Explicit `-g` and/or `-p`:** No scope prompt; use the flag combination.

3. **Named skill(s), no `-g`/`-p`:** Do **not** prompt; treat scope as **both** (check/update each scope that has that skill).

4. **`-y` or non-interactive, no `-g`/`-p`:**  
   - If **project has skills** (see below) → **project**  
   - Else → **global**

### “Project has skills” (for auto-detect only)

Align with vercel’s `hasProjectSkills` spirit, using dt-skill paths:

- Project lock file exists under the project `.agents` / `.dt-skill` layout, **or**
- Project `.agents/skills/<name>/SKILL.md` exists for at least one skill directory  

Do not invent a second lock filename solely for this check.

## Update detection (unchanged product commitment)

For each skill in the resolved scope(s):

1. Load local fingerprint (prefer on-disk skill content; fall back to lock entry if needed).  
2. Load remote current identity from registry skill detail (**content fingerprint**).  
3. If equal → report up to date (may still refresh lock metadata).  
4. If differ (or local missing remote present) → download zip and replace installed files; write lock + origin fingerprint.

**Not in scope:** GitHub folder tree SHA as primary detector.

## Outcomes and errors

- Per-skill success / up-to-date / skip (e.g. pinned) / fail, with a summary.  
- Scope **both** with a named skill present in only one scope: update that side only.  
- Named skill present in neither scope after both checked: fail that skill (non-zero exit if any fails), consistent with current failure aggregation.  
- Pinned skills: keep existing pin behavior (skip or require unpin).

## Explicit non-goals (this design)

- Changing install interactive scope or adding install “both”.  
- Changing list/uninstall default scope or adding list/uninstall “Update scope” prompt.  
- Migrating lock file names to vercel’s.  
- Reworking agent symlink matrices except as required for correct update path resolution.

## Success criteria

- In a TTY, `dt-skill update` with no scope flags shows the three-way **Update scope** prompt.  
- `-g` / `-p` / both flags and named-skill → both behavior match the table above.  
- `-y` uses project-if-present else global.  
- Global-only installs are updatable when the user selects Global or Both (or `-g`), without requiring a separate mental model beyond vercel’s.  
- Fingerprint comparison remains the update gate.

## Implementation note (not product)

Existing experimental auto-guess logic for update paths (if any) must be **replaced** by the rules above; interactive three-way prompt is primary, not silent global fallback.
