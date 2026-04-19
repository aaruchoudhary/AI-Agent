# Deploying the Jira QA dashboard for your team

The app is a single Node server: static UI + JSON APIs + Playwright (Chromium). Deploy one instance per environment (or per team) and share the HTTPS URL.

## GitHub → production (quick path)

### Standalone repo (this app is the repository root)

1. Put only the contents of `jira-qa-test-dashboard` in a new Git repo.
2. Push to GitHub. CI runs from `.github/workflows/ci.yml` in this folder.
3. On **Render:** Blueprint → use this folder’s `render.yaml` → set env vars in the dashboard.

### Monorepo (this app is in `…/jira-qa-test-dashboard`)

1. Push the whole repository (e.g. `AI Agent`).
2. CI: use the repo root workflow that sets `working-directory: jira-qa-test-dashboard` (see parent `README.md`).
3. On **Render:** use the **repository root** `render.yaml` (`rootDir: jira-qa-test-dashboard`). Docker only sees files under that directory.

On **Railway:** create a service, set **Root Directory** to `jira-qa-test-dashboard`, connect GitHub, and add the same env vars.

Always set real values for `JIRA_*`, and set `DASHBOARD_TOKEN` yourself (do not commit it).

## Environment variables (set in your host’s dashboard, not in git)

| Variable | Required | Purpose |
|----------|----------|---------|
| `JIRA_HOST` | Yes | e.g. `https://your-site.atlassian.net` |
| `JIRA_EMAIL` | Yes | Atlassian account email for API calls |
| `JIRA_API_TOKEN` | Yes | [API token](https://id.atlassian.com/manage-profile/security/api-tokens) |
| `OPENAI_API_KEY` | No | Richer, ticket-grounded test generation |
| `PORT` | No | Defaults to `3847`; many hosts set `PORT` automatically |
| `DASHBOARD_TOKEN` | **Recommended** on the public internet | Shared secret; users paste it once in the UI (stored in the browser session only) |
| `NODE_ENV` | No | Set to `production` in hosted environments |
| `TRUST_PROXY` | No | Set to `1` when behind Render/Fly/Railway/nginx so client IPs behave correctly |

**Shared Jira user:** Everyone using the same deployment shares the same Jira identity in `JIRA_*` (typical for an internal automation service account). Project permissions in Jira still control which issues they can read.

## Option A: Docker (any cloud VM, ECS, Kubernetes, etc.)

```bash
docker build -t jira-qa-dashboard .
docker run --rm -p 3847:3847 \
  -e JIRA_HOST="https://your-domain.atlassian.net" \
  -e JIRA_EMAIL="bot@company.com" \
  -e JIRA_API_TOKEN="***" \
  -e OPENAI_API_KEY="***" \
  -e DASHBOARD_TOKEN="a-long-random-secret" \
  jira-qa-dashboard
```

Put TLS in front with your cloud load balancer, Caddy, or nginx.

## Option B: Render / Railway / Fly.io

1. Create a **Web service** from this repo (root directory `jira-qa-test-dashboard` or monorepo subpath if your host supports it).
2. **Build command:** `npm ci && npm run build`
3. **Start command:** `npm start`
4. **Install Playwright browsers:** On generic Node images you must add a build step such as `npx playwright install --with-deps chromium` after `npm ci`. If the host supports **Dockerfile** deploys, prefer **Option A** so browsers and OS libraries are preinstalled.

5. Set the environment variables above in the service settings.

## Health check

Use `GET /api/health` for readiness (returns JSON, no auth so load balancers can probe). All `POST /api/*` business routes respect `DASHBOARD_TOKEN` when set.

## Capacity

Each **Run all** session launches Chromium and runs tests sequentially. For many concurrent users, scale **horizontal replicas** or queue runs; a single small instance is fine for a small QA team.
