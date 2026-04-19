import { chromium, type Page } from "playwright";
import type { ExecutionResult, PlaywrightStep, TestCase } from "./types.js";

function resolveUrl(baseUrl: string, pathOrUrl: string | undefined): string {
  if (!pathOrUrl) return baseUrl;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  return new URL(pathOrUrl, baseUrl).toString();
}

async function runStep(page: Page, baseUrl: string, step: PlaywrightStep): Promise<void> {
  switch (step.action) {
    case "goto": {
      const target = resolveUrl(baseUrl, step.url ?? "/");
      await page.goto(target, { waitUntil: "domcontentloaded", timeout: 45_000 });
      return;
    }
    case "click": {
      if (!step.selector) throw new Error("click requires selector");
      await page.locator(step.selector).first().click({ timeout: 20_000 });
      return;
    }
    case "fill": {
      if (!step.selector) throw new Error("fill requires selector");
      await page.locator(step.selector).first().fill(step.value ?? "", { timeout: 20_000 });
      return;
    }
    case "expectVisible": {
      if (!step.selector) throw new Error("expectVisible requires selector");
      await page.locator(step.selector).first().waitFor({ state: "visible", timeout: 20_000 });
      return;
    }
    case "expectHidden": {
      if (!step.selector) throw new Error("expectHidden requires selector");
      await page.locator(step.selector).first().waitFor({ state: "hidden", timeout: 20_000 });
      return;
    }
    case "expectText": {
      if (!step.selector) throw new Error("expectText requires selector");
      const text = step.text ?? "";
      await page.locator(step.selector).first().waitFor({ state: "visible", timeout: 20_000 });
      const content = await page.locator(step.selector).first().innerText();
      if (!content.includes(text)) {
        throw new Error(`Expected text "${text}" in ${step.selector}, got "${content.slice(0, 200)}"`);
      }
      return;
    }
    case "expectTitleContains": {
      const t = step.text ?? "";
      await page.waitForLoadState("domcontentloaded");
      const title = await page.title();
      if (!title.includes(t)) {
        throw new Error(`Expected title to include "${t}", got "${title}"`);
      }
      return;
    }
    case "waitForTimeout": {
      const ms = Math.min(step.ms ?? 0, 5000);
      await page.waitForTimeout(ms);
      return;
    }
    default:
      throw new Error(`Unknown action: ${(step as PlaywrightStep).action}`);
  }
}

export async function executeTestCases(
  baseUrl: string,
  testCases: TestCase[],
): Promise<ExecutionResult[]> {
  const normalizedBase = baseUrl.replace(/\/$/, "") + "/";
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const results: ExecutionResult[] = [];

  try {
    for (const tc of testCases) {
      const started = Date.now();
      const page = await context.newPage();
      let failedStepIndex = 0;
      try {
        for (let i = 0; i < tc.playwrightSteps.length; i++) {
          failedStepIndex = i;
          await runStep(page, normalizedBase, tc.playwrightSteps[i]!);
        }
        results.push({
          testId: tc.id,
          title: tc.title,
          status: "passed",
          durationMs: Date.now() - started,
        });
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        results.push({
          testId: tc.id,
          title: tc.title,
          status: "failed",
          durationMs: Date.now() - started,
          error: err,
          stepIndex: failedStepIndex,
        });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}
