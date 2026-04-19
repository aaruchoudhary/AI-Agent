# Jira QA Test Dashboard

Web dashboard: load a **Jira issue**, **generate** structured test cases from the description, **run** automation (Playwright / Chromium) against a **base URL** you provide.

**Fast run:** `npm ci` → `npx playwright install chromium` → `npm run dev` → open **http://localhost:3847**

Full step-by-step (local + Render): **[SETUP.md](./SETUP.md)**

## Repository layout (important for deploy)

**Option A — This folder is the Git repo root (recommended for a “dashboard-only” repo):**  
Use the `Dockerfile`, `render.yaml`, and `.github/workflows/ci.yml` **inside this folder**. Paths match a standalone repository.

**Option B — This folder lives inside a monorepo (e.g. `AI Agent`):**  
Use the **parent** repository’s:

- `.github/workflows/jira-qa-dashboard-ci.yml` — CI with `working-directory: jira-qa-test-dashboard`
- `render.yaml` at the **repo root** — native **Node** service with `rootDir: jira-qa-test-dashboard`

Do **not** rely on this folder’s `.github/workflows` when the Git root is above it; GitHub only loads workflows from the repository root.

## Requirements

- **Node.js 22+** for local dev and non-Docker production builds
- **Jira Cloud** REST credentials (`JIRA_HOST`, `JIRA_EMAIL`, `JIRA_API_TOKEN`)
- Optional **OpenAI** API key for richer, ticket-grounded cases

## Local development

```bash
cp .env.example .env
# Edit .env with real Jira values (and optional OPENAI_API_KEY, DASHBOARD_TOKEN)

npm ci
npx playwright install chromium
npm run dev
```

Open `http://localhost:3847` (or `PORT` from `.env`).

## Production build (Node, no Docker)

```bash
npm ci
npx playwright install --with-deps chromium
npm run build
NODE_ENV=production npm start
```

Use a process manager (systemd, PM2) and TLS termination (nginx, Caddy, cloud load balancer).

## Production (Docker, recommended)

Chromium and OS libraries are included via the official Playwright image.

```bash
docker build -t jira-qa-dashboard .
docker run --rm -p 3847:3847 --env-file .env jira-qa-dashboard
```

See [DEPLOY.md](./DEPLOY.md) for cloud env vars, `DASHBOARD_TOKEN`, and scaling notes.

**Railway:** connect the GitHub repo; if the Dockerfile is at the root of the service, Railway will build it automatically. Add environment variables in the Railway dashboard.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_HOST` | Yes | `https://your-domain.atlassian.net` |
| `JIRA_EMAIL` | Yes | Atlassian account for API |
| `JIRA_API_TOKEN` | Yes | API token |
| `OPENAI_API_KEY` | No | Better test generation |
| `PORT` | No | Default `3847` |
| `DASHBOARD_TOKEN` | Recommended on public URLs | Shared secret; UI stores it in sessionStorage |
| `NODE_ENV` | No | `production` in hosted environments |
| `TRUST_PROXY` | No | `1` behind reverse proxies |
| `PUBLIC_BASE_URL` | No | Shown in logs only |

Never commit `.env`.

## API

- `GET /api/health` — readiness (no auth)
- `POST /api/jira/issue`, `/api/plan`, `/api/tests/generate`, `/api/tests/execute` — require `DASHBOARD_TOKEN` when set (`Authorization: Bearer …`)

## License

Private / internal use unless you add a license file.
