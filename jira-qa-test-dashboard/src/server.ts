import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import { z } from "zod";
import { fetchJiraIssue } from "./jira.js";
import { generateTestCases } from "./generateTests.js";
import { executeTestCases } from "./runner.js";
import { TestCaseSchema, type TestCase } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const isProduction = process.env.NODE_ENV === "production";

dotenv.config({ path: path.join(rootDir, ".env") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const app = express();
if (process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

const dashboardToken = process.env.DASHBOARD_TOKEN?.trim();

function authIfRequired(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!dashboardToken) return next();
  const bearer = req.headers.authorization;
  if (bearer === `Bearer ${dashboardToken}`) return next();
  if (req.get("X-Dashboard-Token") === dashboardToken) return next();
  res.status(401).json({
    error:
      "This server requires an access token. Ask your admin for DASHBOARD_TOKEN, enter it under Team access token, then retry.",
  });
}

const IssueKeySchema = z.object({
  issueKey: z.string().min(2).max(32),
});

const GenerateSchema = z.object({
  summary: z.string(),
  descriptionText: z.string().optional().default(""),
});

function withHttps(url: string): string {
  const t = url.trim();
  if (!t) return t;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

const ExecuteSchema = z.object({
  baseUrl: z
    .string()
    .trim()
    .min(1, "Target URL is required")
    .transform(withHttps)
    .pipe(z.string().url({ message: "Enter a valid site URL (e.g. https://qa.example.com)" })),
  testCases: z.array(TestCaseSchema),
});

const PlanSchema = z.object({
  issueKey: z.string().min(2).max(32),
});

function jiraEnvIsPlaceholder(): boolean {
  const host = process.env.JIRA_HOST?.trim() ?? "";
  const email = process.env.JIRA_EMAIL?.trim() ?? "";
  const token = process.env.JIRA_API_TOKEN?.trim() ?? "";
  if (!host || !email || !token) return true;
  if (/your-domain/i.test(host) || host.includes("example.com")) return true;
  if (/^you@company\.com$/i.test(email)) return true;
  if (token === "your_token") return true;
  return false;
}

function jiraConfig() {
  const host = process.env.JIRA_HOST?.trim();
  const email = process.env.JIRA_EMAIL?.trim();
  const token = process.env.JIRA_API_TOKEN?.trim();
  if (!host || !email || !token) {
    throw new Error("Missing JIRA_HOST, JIRA_EMAIL, or JIRA_API_TOKEN in .env");
  }
  if (jiraEnvIsPlaceholder()) {
    throw new Error(
      "Jira .env still has placeholder values. Replace JIRA_HOST, JIRA_EMAIL, and JIRA_API_TOKEN with your real Jira Cloud site and API token.",
    );
  }
  return { host, email, token };
}

app.get("/api/health", (_req, res) => {
  const missing: string[] = [];
  if (!process.env.JIRA_HOST?.trim()) missing.push("JIRA_HOST");
  if (!process.env.JIRA_EMAIL?.trim()) missing.push("JIRA_EMAIL");
  if (!process.env.JIRA_API_TOKEN?.trim()) missing.push("JIRA_API_TOKEN");
  const filled = missing.length === 0;
  const placeholder = filled && jiraEnvIsPlaceholder();
  res.json({
    ok: true,
    jiraConfigured: filled && !placeholder,
    jiraPlaceholder: placeholder,
    authRequired: Boolean(dashboardToken),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    ...(!isProduction
      ? { missingJiraEnv: missing, envPath: path.join(rootDir, ".env") }
      : { missingJiraEnv: missing.length ? missing : undefined }),
  });
});

app.post("/api/jira/issue", authIfRequired, async (req, res) => {
  try {
    const { issueKey } = IssueKeySchema.parse(req.body);
    const { host, email, token } = jiraConfig();
    const issue = await fetchJiraIssue(host, email, token, issueKey);
    res.json(issue);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(400).json({ error: msg });
  }
});

app.post("/api/tests/generate", authIfRequired, async (req, res) => {
  try {
    const body = GenerateSchema.parse(req.body);
    const testCases = await generateTestCases({
      summary: body.summary,
      descriptionText: body.descriptionText,
      openaiApiKey: process.env.OPENAI_API_KEY,
    });
    res.json({ testCases });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(400).json({ error: msg });
  }
});

app.post("/api/tests/execute", authIfRequired, async (req, res) => {
  try {
    const body = ExecuteSchema.parse(req.body);
    const results = await executeTestCases(body.baseUrl, body.testCases as TestCase[]);
    res.json({ results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(400).json({ error: msg });
  }
});

app.post("/api/plan", authIfRequired, async (req, res) => {
  try {
    const { issueKey } = PlanSchema.parse(req.body);
    const { host, email, token } = jiraConfig();
    const issue = await fetchJiraIssue(host, email, token, issueKey);
    const testCases = await generateTestCases({
      summary: issue.summary,
      descriptionText: issue.descriptionText,
      openaiApiKey: process.env.OPENAI_API_KEY,
    });
    res.json({ issue, testCases });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(400).json({ error: msg });
  }
});

const port = Number(process.env.PORT) || 3847;
const publicBase = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "");

app.listen(port, "0.0.0.0", () => {
  const local = `http://127.0.0.1:${port}`;
  if (publicBase) {
    console.log(`Jira QA dashboard (public): ${publicBase}`);
  }
  console.log(`Jira QA dashboard (local): ${local}`);
});
