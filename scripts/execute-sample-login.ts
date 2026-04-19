import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

async function main() {
  const baseUrl = process.argv[2] ?? "https://storefront.v4.qa3.angara.com/customer/account";
  await mkdir("artifacts", { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const result: {
    status: "passed" | "failed";
    details: string;
    checks: Record<string, boolean>;
    screenshot: string;
  } = {
    status: "failed",
    details: "",
    checks: {},
    screenshot: "artifacts/sample-login-case.png"
  };

  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    const hasEmail =
      (await page.getByLabel(/email/i).isVisible().catch(() => false)) ||
      (await page.getByPlaceholder(/email/i).isVisible().catch(() => false)) ||
      (await page.locator('input[type="email"], input[name*="email" i]').first().isVisible().catch(() => false));
    const hasPassword =
      (await page.getByLabel(/password/i).isVisible().catch(() => false)) ||
      (await page.getByPlaceholder(/password/i).isVisible().catch(() => false)) ||
      (await page.locator('input[type="password"], input[name*="password" i]').first().isVisible().catch(() => false));
    const hasSignIn = await page.getByRole("button", { name: /sign in/i }).isVisible().catch(() => false);

    result.checks = {
      emailFieldVisible: hasEmail,
      passwordFieldVisible: hasPassword,
      signInButtonVisible: hasSignIn
    };

    if (hasEmail && hasPassword && hasSignIn) {
      result.status = "passed";
      result.details = "Login form rendered with email, password and sign in button.";
    } else {
      result.status = "failed";
      result.details = "One or more expected login elements were not visible.";
    }
  } catch (error) {
    result.status = "failed";
    result.details = `Execution error: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    await page.screenshot({ path: result.screenshot, fullPage: true }).catch(() => null);
    await browser.close();
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
