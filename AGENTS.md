# Cortex Code project instructions

This repository is Team Astra's workspace for the DATUM STUDIO 2026 summer internship Day 5 hackathon.

Before making plans, writing code, or changing Snowflake objects, read `HANDOFF_DAY5_CORTEX.md` completely. It contains the verified task constraints, data inventory, data-quality caveats, repository state, and the required discovery workflow.

## Current phase

The first task is discovery and ideation. Inspect the available data and the hackathon conditions with read-only operations, then present candidate app ideas for the owner to choose from. Do not scaffold or implement an app during that first task.

The owner's explicit instructions in the current conversation take precedence over this phase marker. After the owner selects an idea, proceed with the selected work and create the four course documents described in the handoff before or alongside implementation.

## Working with Snowflake App Runtime & Frontend Skills

When developing full-stack web applications on Snowflake App Runtime:

1. **App Runtime Infrastructure & Deployment (Highest Priority)**:
   - Always prioritize Snowflake's official bundled skill `/snowflake-apps` for project scaffolding, directory layout, runtime configuration, Snowflake query helpers (`lib/snowflake.ts`), manifest (`app.yml`), and deployment (`snow app deploy`).
   - Do not replace or bypass the App Runtime project structure with generic templates.

2. **Frontend UI & Visualization Guidelines (`.cortex/skills/`)**:
   - The skills in `.cortex/skills/` are static design guidelines and best practices curated from industry standards for presentation-layer code quality:
     - `shadcn-best-practices` (from shadcn/ui ecosystem): Use for UI composition (Cards, Tabs, Tables, Controls, semantic styling) via `bunx --bun shadcn@latest`.
     - `react-best-practices` (from Vercel Engineering): Follow React / Next.js performance rules (Server/Client component boundaries, eliminating waterfalls, avoiding re-renders).
     - `react-and-nextjs-data-visualization` (from Web Data Visualization engineering): Use for hydration-safe charting, responsive layouts, and clean integration between React and chart renderers.
   - **Cortex Code Compatibility**: These skills contain no external browser-control or MCP-tool dependencies. They run safely within Cortex Code CLI using standard file editing and shell commands.
   - Do not use external skills for authentication or database drivers; use App Runtime's native `querySnowflake` helper.

## Working rules

- Use the existing Snowflake connection named `dev`; do not print, copy, replace, or commit credentials.
- During discovery, restrict Snowflake work to `SELECT`, `DESCRIBE`, `SHOW`, and `EXPLAIN`.
- Do not create a Workspace. A prior Workspace was accidentally broad in scope and has already been removed.
- Before any Snowflake write or deployment, state the exact database, schema, object names, command, and expected effect. Use only the destination agreed with the owner.
- Never alter or drop objects in another team's database. Do not rebuild all of `TEAM_A_DB.DEVELOPMENT`.
- Treat visibility as acceptable; preventing collisions, unwanted writes, and unnecessary compute use is the priority.
- Query and aggregate large Snowflake tables on the server. Do not send raw million-row datasets to the browser.
- Use fixed or parameterized SQL; do not concatenate arbitrary user input into SQL.
- Use `bun` for JavaScript/TypeScript dependencies and scripts. Use `uv` for Python project dependencies.
- Do not commit or push to `main`. Work on a conventional feature branch and preserve existing uncommitted setup files.
- Do not commit `.env`, `.snowflake/config.toml`, key files, tokens, generated credentials, or raw customer-level exports.
- Keep UI text in Japanese and understandable to a non-specialist. Explain definitions and denominators next to metrics.
- Validate the actual rendered app and its main interactions before declaring it complete.

## Source-of-truth references

- `HANDOFF_DAY5_CORTEX.md`: current handoff and verified facts.
- `CORTEX_IDEATION_PROMPT.md`: the exact first assignment to execute.
- `/Users/daisukeyamashiki/Code/Inbox/DATUM_STUDIO/Res/markdown/05_インターン5日目/05_インターン5日目.md`: converted official Day 5 slides.
- `/Users/daisukeyamashiki/Code/Inbox/DATUM_STUDIO/day4-local/sis_app.py`: Day 4 dashboard reference; do not treat it as Day 5 source code.

