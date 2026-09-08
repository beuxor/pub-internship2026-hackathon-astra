# Team Astra - Cortex Code Project Instructions

This repository is Team Astra's workspace for the DATUM STUDIO 2026 summer internship Day 5 hackathon.

## Working with Snowflake App Runtime & Frontend Skills

When developing full-stack web applications on Snowflake App Runtime:

1. **App Runtime Infrastructure & Deployment (Highest Priority)**:
   - Always prioritize Snowflake's official bundled skill `/snowflake-apps` for project scaffolding, directory layout, runtime configuration, Snowflake query helpers (`lib/snowflake.ts`), manifest (`app.yml`), and deployment (`snow app deploy`).
   - Do not replace or bypass the App Runtime project structure with generic templates.

2. **Frontend UI & Visualization Guidelines (`.cortex/skills/`)**:
   - Refer to project-local skills in `.cortex/skills/` for presentation-layer code quality:
     - `shadcn-best-practices`: Use for UI composition (Cards, Tabs, Tables, Controls, semantic styling) via `bunx --bun shadcn@latest`.
     - `react-best-practices`: Follow Vercel React/Next.js performance rules (Server/Client component boundaries, eliminating waterfalls, avoiding re-renders).
     - `react-and-nextjs-data-visualization`: Use for hydration-safe charting, responsive layouts, and clean integration between React and chart renderers.
   - Do not use external skills for authentication or database drivers; use App Runtime's native `querySnowflake` helper.

## General Rules

- Keep code simple, readable, and focused on the selected user workflow.
- Pre-aggregate data on the Snowflake server; do not send raw transaction-level rows to the client browser.
- Verify that the local dev server renders without runtime errors before deploying.

