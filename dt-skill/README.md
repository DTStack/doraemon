# `dt-skill`

dt-skill CLI — install, update, search, and publish agent skills plus OpenClaw packages.

## Install

```bash
# Global install
npm install -g dt-skill

# Or use directly via npx (no install)
npx dt-skill --help

# From this repo (shortcut script at repo root)
node dt-skill/bin/dt-skill.js --help
```

## Skill Package Installation

When you install a skill package (a parent skill containing multiple child skills), the CLI presents an interactive fuzzy-search multiselect prompt so you can choose which sub-skills to install:

```bash
dt-skill install my-skill-pack
```

Interaction guide:

- **Type to filter**: Start typing to fuzzy-search the list of child skills.
- **Arrow keys**: `↑` / `↓` to move the cursor.
- **Space**: Toggle selection of the focused skill.
- **Enter**: Confirm and install all selected skills.
- **Esc / Ctrl+C**: Cancel the installation.

Selected child skills are installed into individual folders under your skills directory (`<dir>/<child-slug>`).

## Examples

```bash
dt-skill search "postgres backups"
dt-skill install my-skill-pack
dt-skill pin bear-notes --reason "scanner-flagged while awaiting moderation"
dt-skill update --all
dt-skill update --all --no-input --force
dt-skill unpin bear-notes
dt-skill skill publish ./my-skill-pack --slug my-skill-pack --name "My Skill Pack" --version 1.2.0 --changelog "Fixes + docs"
dt-skill skill publish ./org-skill --owner openclaw --version 1.2.0 --changelog "Org publish"
dt-skill package explore --family skill
dt-skill package explore --family code-plugin
dt-skill package inspect @openclaw/example-plugin
dt-skill package download @openclaw/example-plugin --tag latest
dt-skill package verify ./example-plugin-1.0.0.tgz --package @openclaw/example-plugin --version 1.0.0
dt-skill package publish openclaw/example-plugin
dt-skill package publish openclaw/example-plugin@v1.0.0
dt-skill package publish https://github.com/openclaw/example-plugin --dry-run
dt-skill package publish ./example-plugin-1.0.0.tgz --dry-run
dt-skill package publish ./example-plugin
```

## Publish code plugins

For ClawPack publish, create the npm-pack tarball yourself and upload that
exact `.tgz`:

```bash
npm pack
dt-skill package publish ./my-plugin-1.0.0.tgz --family code-plugin --dry-run
dt-skill package publish ./my-plugin-1.0.0.tgz --family code-plugin
```

For local plugin folders, start with a dry run:

```bash
dt-skill package publish ./my-plugin --family code-plugin --dry-run
dt-skill package publish ./my-plugin --family code-plugin
```

For code plugins, folder publish builds and uploads a ClawPack artifact from
the package folder. Bundle-plugin folders still use the extracted-file publish
path.

Use `dt-skill package download` to resolve the published artifact through
ClawHub's explicit artifact route. ClawPack downloads are verified against npm
integrity/shasum plus ClawHub SHA-256; legacy package versions still download
as ZIPs.

`code-plugin` packages must declare these `package.json` fields:

- `openclaw.compat.pluginApi`
- `openclaw.build.openclawVersion`

Minimal example:

```json
{
  "name": "@myorg/openclaw-my-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./index.ts"],
    "compat": {
      "pluginApi": ">=2026.3.24-beta.2"
    },
    "build": {
      "openclawVersion": "2026.3.24-beta.2"
    }
  }
}
```

`package.json.version` does not replace these OpenClaw-specific fields. Add
`openclaw.compat.minGatewayVersion` and
`openclaw.build.pluginSdkVersion` when you want richer compatibility metadata,
but they are not required for publish.

## GitHub Actions

This repo also provides an official reusable workflow for plugin repos:

- [`.github/workflows/package-publish.yml`](../../.github/workflows/package-publish.yml)

Use `dry_run: true` on pull requests and reserve real publishes for trusted events
such as `workflow_dispatch` or tag pushes with a `CLAWHUB_TOKEN` secret.
For monorepos, pass `source_path` to publish the plugin package folder, for
example `source_path: extensions/codex`.

## Maintainers

The `dt-skill` npm package is released separately from the ClawHub app deploy.

- Release workflow: [`.github/workflows/clawhub-cli-npm-release.yml`](../../.github/workflows/clawhub-cli-npm-release.yml)
- Release model: manual-only, stable tags only (`vX.Y.Z`), with a preflight run before the real publish
- Publish auth: npm trusted publishing through the `npm-release` GitHub environment

## Development

The supported verification flow for this package is package-local:

```bash
bun run --cwd dt-skill test
bun run --cwd dt-skill verify:build
bun run --cwd dt-skill test:artifact
bun run --cwd dt-skill verify
```

`test` runs source tests only. `test:artifact` builds `dist/` and runs a small smoke suite against the built CLI entrypoint.

## Sync (upload local skills)

```bash
# Start anywhere; scans workdir first, then legacy Clawdis/Clawd/OpenClaw/Moltbot locations.
dt-skill sync

# Explicit roots + non-interactive dry-run
dt-skill sync --root ../clawdis/skills --all --dry-run
```

## Defaults

- Registry: no static default. Commands copied from the Doraemon Skills page include `--registry <window.location.origin>`.
- Registry resolution order: `--registry`, `CLAWHUB_REGISTRY` (legacy `CLAWDHUB_REGISTRY`), cached config, then discovery from an explicit site.
- Explicit registry addresses are cached for later commands. Override the config path via `CLAWHUB_CONFIG_PATH` (legacy `CLAWDHUB_CONFIG_PATH`).
- Site discovery: opt in with `--site`, `CLAWHUB_SITE`, or legacy `CLAWDHUB_SITE`; the site must expose `/.well-known/clawhub.json`.
- Workdir: current directory (falls back to Clawdbot workspace if configured; override via `--workdir` or `CLAWHUB_WORKDIR`)
- Install dir: `./skills` under workdir (override via `--dir`)
