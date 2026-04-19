# Setup (local + cloud)

**Proceed in order:** (1) Run **local** dashboard → **http://localhost:3847**. (2) On **[Render](https://dashboard.render.com/)**, create the **Blueprint** from **`main`** so the service goes **Live**. (3) Optional: add **`RENDER_DEPLOY_HOOK_URL`** in GitHub **Actions** secrets so pushes can trigger deploys (see bottom).

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

Repo: **https://github.com/aaruchoudhary/AI-Agent** (branch **`main`**, `render.yaml` at the **root**).

### Render click path (first time)

1. Open **[Render Dashboard](https://dashboard.render.com/)** and sign in.
2. **New** → **Blueprint**.
3. Under **Git Provider**, choose **GitHub** and authorize if asked.
4. Select repository **`AI-Agent`** (`aaruchoudhary/AI-Agent`), branch **`main`**.
5. Render should detect **`render.yaml`** in the repo root and show a service named **`qatestcases`**. Click **Apply** / **Create** / **Connect** (wording varies).
6. Wait for **Build** → **Deploy** (including **Pre-deploy** Playwright step) to finish; status should become **Live**.
7. Copy the **HTTPS URL** from the service page and test **`/api/health`** as below.

If Render says it **cannot find `render.yaml`**, confirm the file exists on **`main`** at the **repository root** (not only inside a subfolder path in the UI).

### After the service exists

1. [Render Dashboard](https://dashboard.render.com) → open the **qatestcases** web service.
2. **Manual Deploy** → **Deploy latest commit** whenever you push fixes to **`main`**.
3. Copy the **exact** **`.onrender.com`** URL from the top of the service page (do not guess it). The name **`qatestcases`** is often `https://qatestcases.onrender.com`, but Render may use another host if that name was taken.
4. Confirm the app: **`https://YOUR-HOST/api/health`** should return JSON with `"ok":true`. **404** usually means the service is not live, the URL is wrong, or deploy failed — open **Logs** (Build + Deploy).
5. **Environment** → add (never commit these):
   - `JIRA_HOST`, `JIRA_EMAIL`, `JIRA_API_TOKEN`
   - Optional: `OPENAI_API_KEY`, `DASHBOARD_TOKEN`, `PUBLIC_BASE_URL` (your real Render HTTPS URL)
6. **Do not** set **`PORT`** — Render injects it.

Render runs **`npm ci && npm run build`** first, then **`npx playwright install chromium`** in **pre-deploy** (before `npm start`). If a step fails, check **Build logs** (build) and **Deploy logs** (pre-deploy). See [DEPLOY.md](./DEPLOY.md). For local Docker debugging, use **`docker build`** from `jira-qa-test-dashboard`.

---

## 3) Quick reference

| Goal | What to use |
|------|----------------|
| Only you, same PC | `npm run dev` → localhost |
| Team / phone / laptop off | Render (or another host) → HTTPS URL |

Secrets live in **`.env` (local)** or **Render environment variables (cloud)** only.

### Deploy from GitHub (optional)

After the Render service exists once: **Render → Web Service → Settings → Deploy hook** → copy the URL. In **GitHub → Settings → Secrets and variables → Actions**, create **`RENDER_DEPLOY_HOOK_URL`** with that URL. Pushes to **`main`** that touch `jira-qa-test-dashboard/` or **`render.yaml`** will run **Actions → Render deploy hook** and call Render for you. You can also run that workflow **manually** from the Actions tab.
