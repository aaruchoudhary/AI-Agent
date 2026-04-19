# Setup (local + cloud)

## 1) Local (your laptop)

Use this when you want **http://localhost:3847** — it **only works while your PC is on** and the dev server is running.

1. Install **Node.js 22+** and **Git**.
2. In a terminal:

```bash
cd jira-qa-test-dashboard
cp .env.example .env
```

3. Edit **`.env`**:
   - **Required for Jira “Fetch”:** `JIRA_HOST`, `JIRA_EMAIL`, `JIRA_API_TOKEN` (real Jira Cloud values, not placeholders).
   - **Optional:** `OPENAI_API_KEY` (better test generation), `DASHBOARD_TOKEN` (protects API if you expose the app).

4. Install and run:

```bash
npm ci
npx playwright install chromium
npm run dev
```

5. Open **http://localhost:3847** in your browser.

**Production-style run on the same machine (no watch):**

```bash
npm run build
npm start
```

---

## 2) Cloud (works when the laptop is off)

Deploy to **Render** from your GitHub repo (this app is configured in the **parent** repo’s `render.yaml` when you use the `AI-Agent` monorepo).

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** (or connect the repo and apply `render.yaml`).
2. Pick repo **`aaruchoudhary/AI-Agent`** (or yours) and branch **`main`**.
3. After the first deploy, open the **`.onrender.com` URL** shown on the service (that is your **public** link).
4. In **Environment**, set (never commit these):
   - `JIRA_HOST`, `JIRA_EMAIL`, `JIRA_API_TOKEN`
   - Optional: `OPENAI_API_KEY`, `DASHBOARD_TOKEN`, `PUBLIC_BASE_URL` (your Render URL)
5. **Do not** set `PORT` manually — Render sets it.

If the build fails on Playwright, check the **Build logs** on Render; see [DEPLOY.md](./DEPLOY.md).

---

## 3) Quick reference

| Goal | What to use |
|------|----------------|
| Only you, same PC | `npm run dev` → localhost |
| Team / phone / laptop off | Render (or another host) → HTTPS URL |

Secrets live in **`.env` (local)** or **Render environment variables (cloud)** only.
