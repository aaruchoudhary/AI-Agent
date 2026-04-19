const $ = (id) => document.getElementById(id);

const TOKEN_KEY = "jira_dashboard_token";

const state = {
  issue: null,
  summary: "",
  testCases: [],
};

function authHeaders() {
  const t = sessionStorage.getItem(TOKEN_KEY)?.trim();
  if (!t) return {};
  return { Authorization: `Bearer ${t}` };
}

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 4200);
}

async function api(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    $("tokenPanel")?.removeAttribute("hidden");
  }
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function renderIssue() {
  const meta = $("issueMeta");
  if (!state.issue) {
    meta.textContent = "No ticket loaded.";
    meta.classList.add("muted");
    return;
  }
  meta.classList.remove("muted");
  meta.innerHTML = `
    <strong>${escapeHtml(state.issue.key)}</strong> — ${escapeHtml(state.issue.summary)}<br/>
    <span class="muted">${escapeHtml(state.issue.status || "")} · ${escapeHtml(state.issue.issueType || "")}</span><br/>
    <a href="${escapeHtml(state.issue.url)}" target="_blank" rel="noreferrer">Open in Jira</a>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function clip(s, n) {
  const t = String(s ?? "");
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function renderCases() {
  const tbody = $("casesTable").querySelector("tbody");
  tbody.innerHTML = "";
  $("caseCount").textContent = `${state.testCases.length} case(s)`;
  for (const tc of state.testCases) {
    const tr = document.createElement("tr");
    const auto = (tc.playwrightSteps || [])
      .map((s) => `${s.action}${s.selector ? ` ${s.selector}` : ""}${s.url ? ` ${s.url}` : ""}`)
      .join(" → ");
    const narrative = Array.isArray(tc.narrativeSteps) ? tc.narrativeSteps.join(" · ") : "";
    const trace = tc.requirementTrace ?? "";
    const expected = tc.expectedResult ?? "";
    tr.innerHTML = `
      <td>${escapeHtml(tc.id)}</td>
      <td title="${escapeHtml(tc.title)}">${escapeHtml(clip(tc.title, 72))}</td>
      <td>${escapeHtml(tc.type)}</td>
      <td class="multiline" title="${escapeHtml(trace)}">${escapeHtml(clip(trace, 220))}</td>
      <td class="multiline" title="${escapeHtml(expected)}">${escapeHtml(clip(expected, 200))}</td>
      <td class="multiline" title="${escapeHtml(narrative)}">${escapeHtml(clip(narrative, 260))}</td>
      <td><code class="code-tiny">${escapeHtml(clip(auto, 320))}</code></td>
    `;
    tbody.appendChild(tr);
  }
}

function renderResults(results) {
  const tbody = $("resultsTable").querySelector("tbody");
  tbody.innerHTML = "";
  const passed = results.filter((r) => r.status === "passed").length;
  const failed = results.filter((r) => r.status === "failed").length;
  $("runSummary").classList.remove("muted");
  $("runSummary").textContent = `${passed} passed, ${failed} failed (${results.length} total)`;
  for (const r of results) {
    const tr = document.createElement("tr");
    const pill =
      r.status === "passed"
        ? `<span class="pill pass">passed</span>`
        : `<span class="pill fail">failed</span>`;
    const detail =
      r.error != null
        ? `${escapeHtml(r.error)}${r.stepIndex != null ? ` (step ${r.stepIndex})` : ""}`
        : "";
    tr.innerHTML = `
      <td>${escapeHtml(r.testId)}</td>
      <td>${escapeHtml(r.title)}</td>
      <td>${pill}</td>
      <td>${r.durationMs} ms</td>
      <td>${detail}</td>
    `;
    tbody.appendChild(tr);
  }
}

async function refreshHealth() {
  const banner = $("warnBanner");
  const tokenPanel = $("tokenPanel");
  const accessInput = $("accessToken");
  try {
    const h = await fetch("/api/health").then((r) => r.json());
    if (h.authRequired) {
      tokenPanel?.removeAttribute("hidden");
      const saved = sessionStorage.getItem(TOKEN_KEY);
      if (accessInput && saved) accessInput.value = saved;
    } else {
      tokenPanel?.setAttribute("hidden", "");
    }
    $("health").innerHTML = `
      API ok · Jira: ${h.jiraConfigured ? "configured" : "not configured"} ·
      OpenAI: ${h.openaiConfigured ? "on (richer tests)" : "off (heuristic tests)"}
      ${h.authRequired ? " · <strong>token required</strong> for API calls" : ""}
    `;
    if (!h.jiraConfigured) {
      const envFile = h.envPath ? `<code>${escapeHtml(h.envPath)}</code>` : "<code>.env</code>";
      const miss = Array.isArray(h.missingJiraEnv) ? h.missingJiraEnv.filter(Boolean).join(", ") : "";
      banner.hidden = false;
      const missingLine =
        miss.length > 0
          ? `Set <code>${escapeHtml(miss)}</code> in <code>.env</code>, then restart <code>npm run dev</code>. File: ${envFile}.`
          : "";
      const ph = h.jiraPlaceholder
        ? `Replace placeholder values in ${envFile} (your-domain / you@company.com / your_token) with your real Jira Cloud host, account email, and API token, then restart <code>npm run dev</code>.`
        : missingLine;
      banner.innerHTML = `<strong>Jira is not wired up.</strong> ${h.jiraPlaceholder ? ph : `Copy <code>.env.example</code> to <code>.env</code>. ${missingLine}`}`;
    } else {
      banner.hidden = true;
      banner.textContent = "";
    }
  } catch {
    $("health").textContent = "API unreachable";
    banner.hidden = false;
    banner.textContent = "Cannot reach the dashboard API. Confirm the server is running (npm run dev) and you opened the same host/port.";
  }
}

$("btnFetch").addEventListener("click", async () => {
  const issueKey = $("issueKey").value.trim();
  if (!issueKey) return toast("Enter a Jira issue key.");
  $("btnFetch").disabled = true;
  try {
    const issue = await api("/api/jira/issue", { issueKey });
    state.issue = issue;
    state.summary = issue.summary;
    $("description").value = issue.descriptionText || "";
    renderIssue();
    toast("Ticket loaded.");
  } catch (e) {
    toast(e.message);
  } finally {
    $("btnFetch").disabled = false;
  }
});

$("btnPlan").addEventListener("click", async () => {
  const issueKey = $("issueKey").value.trim();
  if (!issueKey) return toast("Enter a Jira issue key.");
  $("btnPlan").disabled = true;
  try {
    const data = await api("/api/plan", { issueKey });
    state.issue = data.issue;
    state.summary = data.issue.summary;
    state.testCases = data.testCases;
    $("description").value = data.issue.descriptionText || "";
    renderIssue();
    renderCases();
    toast("Ticket loaded and tests generated.");
  } catch (e) {
    toast(e.message);
  } finally {
    $("btnPlan").disabled = false;
  }
});

$("btnGenerate").addEventListener("click", async () => {
  const fromIssue = state.summary || state.issue?.summary || "";
  const summary = fromIssue.trim() ? fromIssue : $("description").value.trim().split("\n")[0] || "";
  if (!summary.trim()) {
    return toast("Fetch a ticket first, or paste requirements in the description (first line used as summary if empty).");
  }
  $("btnGenerate").disabled = true;
  try {
    const data = await api("/api/tests/generate", {
      summary,
      descriptionText: $("description").value,
    });
    state.testCases = data.testCases;
    renderCases();
    toast("Tests generated.");
  } catch (e) {
    toast(e.message);
  } finally {
    $("btnGenerate").disabled = false;
  }
});

$("btnRun").addEventListener("click", async () => {
  const baseUrl = $("baseUrl").value.trim();
  if (!baseUrl) return toast("Enter target base URL.");
  if (!state.testCases.length) return toast("Generate tests first.");
  $("btnRun").disabled = true;
  try {
    const data = await api("/api/tests/execute", { baseUrl, testCases: state.testCases });
    renderResults(data.results);
    toast("Run finished.");
  } catch (e) {
    toast(e.message);
  } finally {
    $("btnRun").disabled = false;
  }
});

$("btnSaveToken")?.addEventListener("click", () => {
  const v = $("accessToken").value.trim();
  if (!v) {
    sessionStorage.removeItem(TOKEN_KEY);
    toast("Token cleared.");
    return;
  }
  sessionStorage.setItem(TOKEN_KEY, v);
  toast("Token saved for this browser session.");
});

renderCases();
refreshHealth();
