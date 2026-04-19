# AI Agent workspace

This repository contains Cursor skills, scripts, and the **Jira QA Test Dashboard** — a production-ready web app under `jira-qa-test-dashboard/`.

## Jira QA Test Dashboard (deploy)

- **Docs & local run:** [jira-qa-test-dashboard/README.md](./jira-qa-test-dashboard/README.md)
- **Production / Docker / secrets:** [jira-qa-test-dashboard/DEPLOY.md](./jira-qa-test-dashboard/DEPLOY.md)

### Monorepo CI

Pushes that touch `jira-qa-test-dashboard/**` run **GitHub Actions** (`.github/workflows/jira-qa-dashboard-ci.yml`): `npm ci` and `npm run build`.

### Monorepo deploy on Render

Use the repository-root **`render.yaml`**: native **Node** service with `rootDir: jira-qa-test-dashboard` (build installs Playwright Chromium). Do **not** set `PORT` in Render. Configure `JIRA_*`, `DASHBOARD_TOKEN`, and other env vars in the Render dashboard after the first deploy.

### Standalone GitHub repo (optional)

To publish **only** the dashboard, copy the `jira-qa-test-dashboard` folder to a new repository root and use the `render.yaml` inside that folder.
