# Noibu AI Plugin

Official Noibu plugin for AI clients. Access Noibu products directly from your AI coding tool.

## Description

Built for ecommerce, the Noibu plugin bridges the gap between customer experience and revenue by connecting Claude
directly to your store's session, error, and conversion data through Noibu — and to the marketing, support, and commerce
platforms that put insight into motion. Go beyond analysis: surface what's costing you revenue, take action across your
stack, build workflows to automate work end-to-end.

## What's included

- **Noibu MCP connector** (`src/.mcp.json`): installing the plugin adds the Noibu MCP server (`https://mcp.noibu.com/mcp`). Users sign in to Noibu the first time they use it.
- **Skills** (`src/skills/`): workflows built on the Noibu tools.

## Installation

### Claude Desktop (manual)

1. Download the Noibu plugin: https://github.com/Noibu/ai-plugin/releases/latest/download/noibu.zip
2. Go to **Customize**
3. Click **Create plugin** → **Upload plugin**
4. Upload the `noibu.zip` file
5. Sign in to Noibu when prompted

### Claude Code

Install directly from the marketplace — no download required:

```shell
/plugin marketplace add Noibu/ai-plugin
/plugin install noibu@noibu-plugins
/reload-plugins
```

Then run `/mcp`, select **plugin:noibu:noibu**, and sign in to Noibu.

## Releases & distribution

This repo (`Noibu/ai-plugin`, public) is the source of truth and feeds two channels:

- **Claude Code** — installs from this repo as a marketplace (`Noibu/ai-plugin`).
- **Cowork** — served from the private mirror `Noibu/ai-plugin-sync`.

Every push to `main` runs `.github/workflows/release.yml`, which:

1. Bumps the patch version (from the latest `v*` git tag),
2. Stamps it into `noibu.zip` only (the committed `plugin.json` carries **no** version),
3. Tags + creates a GitHub release with the versioned `noibu.zip`,
4. Force-pushes `main` to the private `ai-plugin-sync` mirror.

> **Versioning is by commit SHA, deliberately.** `main` is branch-protected, so the
> workflow cannot push a version-bump commit back to it. Instead, `plugin.json` omits
> the `version` field: the marketplace then versions the plugin by commit SHA, so **every
> merge to `main` is a new version** and Claude Code auto-updates with no write to `main`.
> The semver tag/release exists only for the downloadable `noibu.zip` (Claude Desktop +
> the public directory). Do **not** add a `version` field back to `plugin.json` — it would
> re-freeze marketplace updates.

To distribute to all Claude Code users automatically, deploy a managed-settings.json
via MDM with `extraKnownMarketplaces` (pointing at `Noibu/ai-plugin`, `autoUpdate: true`)
and `enabledPlugins: { "noibu@noibu-plugins": true }`.

## How to develop

1. Clone and install the plugin
2. Sign in to Noibu (`/mcp` → **plugin:noibu:noibu** in Claude Code)

- **Packaging:** `task pack` and the release workflow zip `.claude-plugin`, `.mcp.json` and `skills`. Keep `.mcp.json` in both, or releases ship without the connector.
- **Connection check:** every skill opens with the same **Noibu connection check** section. Edit it in every `SKILL.md` together.
- **Plugin overview:** the answer to "what can the Noibu plugin do?" lives in `querying-noibu-data/SKILL.md`.
- **Routing:** skill descriptions include everyday phrasings ("how's my site doing", "why are sales down") so broad questions reach a skill.
- **Duplicate tools:** users who also added the standalone Noibu connector should disconnect it.

## Documentation

https://help.noibu.com/articles/7434601323-installing-the-noibu-plugin-for-claude

## Example Use Cases

### Example 1:

**Spot and act on your top revenue opportunities on autopilot**: Every Monday, surface my highest-impact opportunities
across acquisition, products, and experience, and help me take action on each.

### Example 2:

**Optimize your checkout**: Find where shoppers are dropping off, the payment and delivery methods they're using, and
the technical issues hurting conversion, then tackle the top fixes.

### Example 3:

**Resolve technical issues at the source**: What errors and performance issues are costing my store the most revenue,
and help me resolve them.

### Example 4:

**Uncover and resolve shopper friction**: Surface where real shoppers are struggling, through session replays and
revenue heatmaps, and act on the highest friction.

### Example 5:

**Turn product views into sales**: Find which products and collections are getting views but no sales, diagnose
why they aren't converting, and execute on the biggest opportunities.

### Example 6:

**Shift marketing spend with site behaviour**: Surface which campaigns are sending high-quality traffic, identify
how to lift upper-funnel conversion, and reallocate budget accordingly.

## License

MIT