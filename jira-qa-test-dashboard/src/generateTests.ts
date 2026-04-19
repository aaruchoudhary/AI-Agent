import OpenAI from "openai";
import { TestCaseSchema, type PlaywrightStep, type TestCase } from "./types.js";

const DEFAULT_PLAYWRIGHT: PlaywrightStep[] = [
  { action: "goto", url: "/" },
  { action: "expectVisible", selector: "body" },
];

const SYSTEM = `You are a senior QA engineer writing test cases directly from a Jira issue.

Return JSON ONLY with this shape: { "testCases": TestCase[] }.

Each TestCase MUST include:
- id: "TC-1", "TC-2", ... in order
- title: concise, specific to the requirement (no generic "smoke test" unless the ticket is only about availability)
- type: positive | negative | edge | regression (pick the best fit per case)
- requirementTrace: REQUIRED. Paste a verbatim excerpt from the user's Summary or Description (20–220 chars) that this case proves. Do not invent unrelated quotes.
- preconditions: data, user role, feature flags, or starting URL path if implied by the ticket (if none, say "None beyond app deployed at base URL")
- expectedResult: REQUIRED. One or two sentences stating exactly what should happen (observable UI, API, DB, analytics—whatever the ticket implies).
- narrativeSteps: REQUIRED array of 4–8 short imperative steps. Must read like a manual test: setup, navigate, inputs, assertions, negative checks where relevant. Reference concrete field names, buttons, pages, error messages, or limits mentioned in the ticket.
- playwrightSteps: array of machine steps. Use conservative selectors; if the ticket names visible UI text, you may use expectText with selector "body" and that substring only when it is distinctive (>= 4 chars, unlikely to appear everywhere).

PlaywrightStep actions (exact enum):
- goto: "url" path starting with / or full https URL (first step is usually goto "/")
- click: "selector" CSS
- fill: "selector", "value"
- expectVisible / expectHidden / expectText / expectTitleContains / waitForTimeout as before

Traceability rules:
1) Every test must map to something explicitly stated in Summary or Description. If the ticket lists numbered acceptance criteria, cover each criterion with at least one test (combine only when truly redundant).
2) Add negative/edge tests when the ticket mentions validation, permissions, "should not", errors, empty states, or boundaries.
3) If the description is long, produce MORE tests (see count hint in user message). Prefer depth over duplicates.
4) Do NOT output vague steps like "verify it works" — always say WHAT to verify and HOW you know it passed.
5) JSON only, no markdown fences.`;

function extractPathsFromText(line: string): string[] {
  const paths = new Set<string>();
  const patterns = [
    /\s(\/[A-Za-z0-9][A-Za-z0-9/_-]{0,80})(?=[\s).,]|$)/,
    /`(\/[A-Za-z0-9][A-Za-z0-9/_-]{0,80})`/,
    /["'](\/[A-Za-z0-9][A-Za-z0-9/_-]{0,80})["']/,
    /(?:^|\s)(\/[A-Za-z0-9][A-Za-z0-9/_-]{0,80})(?=[\s).,]|$)/,
  ];
  for (const re of patterns) {
    const r = new RegExp(re.source, "g");
    let m: RegExpExecArray | null;
    while ((m = r.exec(line)) !== null) {
      const p = (m[1] ?? m[0]).trim();
      if (p.startsWith("//")) continue;
      if (p.length >= 2 && p.length <= 120) paths.add(p);
    }
  }
  return [...paths];
}

function extractQuotedSnippet(line: string): string | null {
  const d = line.match(/"([^"]{4,120})"/);
  if (d) return d[1] ?? null;
  const s = line.match(/'([^']{4,120})'/);
  if (s) return s[1] ?? null;
  return null;
}

function inferTypeFromLine(line: string): TestCase["type"] {
  const t = line.toLowerCase();
  if (/\b(must not|should not|cannot|can't|do not|don't|never|reject|deny|403|401|unauthor|invalid|error message|empty state|no results)\b/.test(t)) {
    return "negative";
  }
  if (/\b(edge|boundary|max|min|limit|concurrent|race|timeout|slow network|offline)\b/.test(t)) {
    return "edge";
  }
  if (/\b(regression|previously|used to|broke|again)\b/.test(t)) {
    return "regression";
  }
  return "positive";
}

function buildNarrativeFromLine(line: string, summary: string): string[] {
  const s = summary.trim();
  const steps: string[] = [
    `Map to ticket text: "${line.length > 220 ? `${line.slice(0, 217)}…` : line}"`,
  ];
  if (s) steps.push(`Context from summary: ${s.length > 240 ? `${s.slice(0, 237)}…` : s}`);
  steps.push(
    "Identify preconditions from the description (user type, cart state, feature flag, locale, device) and set up or note them explicitly before executing.",
    "Perform the user/system actions implied by the requirement (navigation, form inputs, toggles, API-triggering clicks) using realistic data from the ticket examples.",
    "Assert all explicit outcomes: visible copy, control states, counts, navigation targets, success/error toasts, disabled buttons, analytics payloads—only what the ticket claims.",
    "For negative wording in the requirement, include at least one counterexample input or path and assert the expected failure/safeguard behavior.",
    "Capture notes for defects: exact URL, repro steps, expected vs actual, and screenshots if automation cannot assert the UI.",
  );
  return steps;
}

function playwrightStubForLine(line: string): PlaywrightStep[] {
  const steps: PlaywrightStep[] = [{ action: "goto", url: "/" }];
  const paths = extractPathsFromText(line);
  const primary = paths[0];
  if (primary) steps.push({ action: "goto", url: primary });
  const snippet = extractQuotedSnippet(line);
  if (snippet) steps.push({ action: "expectText", selector: "body", text: snippet });
  steps.push({ action: "expectVisible", selector: "body" });
  return steps;
}

function isLikelyRequirementLine(line: string): boolean {
  const t = line.toLowerCase();
  if (line.length >= 90) return true;
  if (
    /\b(acceptance|criteria|given|when|then|scenario|user story|as a|i want|so that|should|must|shall|expected|verify|ensure|validation|error|success|field|button|page|screen|flow|checkout|cart|login|payment|api|permission|role)\b/.test(
      t,
    )
  ) {
    return true;
  }
  return line.split(/\s+/).filter(Boolean).length >= 10;
}

function splitRequirementLines(summary: string, description: string): string[] {
  const blob = `${summary}\n\n${description}`.replace(/\r\n/g, "\n");
  const lines = blob
    .split("\n")
    .map((l) => l.replace(/^\s*[-*•]+\s+/, "").replace(/^\s*\d+\.\s+/, "").trim())
    .filter((l) => l.length >= 14 && isLikelyRequirementLine(l));

  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  if (out.length === 0) {
    const fallback = blob
      .split(/\n\n+/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter((p) => p.length >= 24);
    for (const p of fallback) {
      const key = p.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
      if (out.length >= 12) break;
    }
  }
  return out.slice(0, 28);
}

function heuristicCases(summary: string, description: string): TestCase[] {
  const lines = splitRequirementLines(summary, description);
  const seeds =
    lines.length > 0
      ? lines
      : [summary.trim() || "No description lines found; validate summary intent end-to-end."];

  const cases: TestCase[] = seeds.map((line, i) => {
    const id = `TC-${i + 1}`;
    const title =
      line.length > 96 ? `${line.slice(0, 93)}…` : line.length > 0 ? line : `Case ${i + 1}`;
    const type = inferTypeFromLine(line);
    const narrativeSteps = buildNarrativeFromLine(line, summary);
    const expectedResult = `All behaviors implied by the quoted requirement are satisfied with no regressions in adjacent flows mentioned in the ticket.`;
    return {
      id,
      title,
      type,
      requirementTrace: line.length > 220 ? `${line.slice(0, 217)}…` : line,
      preconditions: "Application reachable at the provided base URL; use data and roles implied by the Jira description.",
      expectedResult,
      narrativeSteps,
      playwrightSteps: playwrightStubForLine(line),
    };
  });

  return cases.length ? cases : fallbackSingle(summary, description);
}

function fallbackSingle(summary: string, description: string): TestCase[] {
  const trace = (summary.trim() || description.trim() || "Ticket").slice(0, 220);
  return [
    {
      id: "TC-1",
      title: summary.trim() || "Validate ticket intent",
      type: "positive",
      requirementTrace: trace,
      preconditions: "App deployed; tester has access to the target URL.",
      expectedResult: "The implementation matches the ticket summary/description with no critical UI or flow break.",
      narrativeSteps: buildNarrativeFromLine(trace, summary),
      playwrightSteps: [...DEFAULT_PLAYWRIGHT],
    },
  ];
}

function targetCaseCount(summary: string, description: string): { min: number; max: number } {
  const n = (summary + description).length;
  if (n < 120) return { min: 4, max: 8 };
  if (n < 800) return { min: 8, max: 14 };
  if (n < 2000) return { min: 12, max: 22 };
  return { min: 16, max: 30 };
}

function padNarrative(tc: TestCase, summary: string, trace: string): string[] {
  const existing = tc.narrativeSteps?.filter(Boolean) ?? [];
  if (existing.length >= 4) return existing;
  const filler = buildNarrativeFromLine(trace || tc.title, summary);
  const merged = [...existing];
  for (const step of filler) {
    if (merged.length >= 6) break;
    if (!merged.includes(step)) merged.push(step);
  }
  while (merged.length < 4) {
    merged.push("Re-read the Jira acceptance criteria and add assertions for any bullet not yet exercised.");
  }
  return merged.slice(0, 10);
}

function ensureTrace(tc: TestCase, summary: string, description: string, index: number): string {
  if (tc.requirementTrace && tc.requirementTrace.trim().length >= 15) return tc.requirementTrace.trim();
  const blob = `${summary}\n${description}`.trim();
  const chunk = blob.slice(index * 180, index * 180 + 200).trim();
  return chunk.length >= 15 ? chunk : (summary || description || tc.title).slice(0, 200);
}

function postProcessCases(
  cases: TestCase[],
  summary: string,
  descriptionText: string,
): TestCase[] {
  return cases.map((tc, i) => {
    const trace = ensureTrace(tc, summary, descriptionText, i);
    const narrativeSteps = padNarrative(tc, summary, trace);
    const expectedResult =
      tc.expectedResult?.trim() ||
      `Observed behavior matches the ticket for: "${trace.length > 160 ? `${trace.slice(0, 157)}…` : trace}"`;
    const preconditions =
      tc.preconditions?.trim() ||
      "Follow any environment, account, or data prerequisites spelled out in the Jira description.";
    const playwrightSteps: PlaywrightStep[] =
      tc.playwrightSteps && tc.playwrightSteps.length > 0 ? [...tc.playwrightSteps] : [...DEFAULT_PLAYWRIGHT];
    return {
      ...tc,
      requirementTrace: trace,
      narrativeSteps,
      expectedResult,
      preconditions,
      playwrightSteps,
    };
  });
}

export async function generateTestCases(params: {
  summary: string;
  descriptionText: string;
  openaiApiKey?: string;
}): Promise<TestCase[]> {
  const { summary, descriptionText, openaiApiKey } = params;
  const desc = descriptionText ?? "";
  const bounds = targetCaseCount(summary, desc);

  if (!openaiApiKey) {
    return postProcessCases(heuristicCases(summary, desc), summary, desc);
  }

  const client = new OpenAI({ apiKey: openaiApiKey });
  const user = [
    `Summary:\n${summary || "(empty)"}`,
    "",
    `Description:\n${desc || "(empty)"}`,
    "",
    `Count hint: produce between ${bounds.min} and ${bounds.max} tests based on richness of the description.`,
    "If acceptance criteria are numbered/bulleted, align tests to those bullets and name the bullet in requirementTrace.",
  ].join("\n");

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.15,
    max_tokens: 6000,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    return postProcessCases(heuristicCases(summary, desc), summary, desc);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return postProcessCases(heuristicCases(summary, desc), summary, desc);
  }

  const arr = (parsed as { testCases?: unknown }).testCases;
  if (!Array.isArray(arr)) {
    return postProcessCases(heuristicCases(summary, desc), summary, desc);
  }

  const out: TestCase[] = [];
  for (const item of arr) {
    const r = TestCaseSchema.safeParse(item);
    if (r.success) out.push(r.data);
  }

  const base = out.length ? out : heuristicCases(summary, desc);
  return postProcessCases(base, summary, desc);
}
