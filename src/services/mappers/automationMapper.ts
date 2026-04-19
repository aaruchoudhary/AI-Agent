import { AutomationFramework, TestCase } from "../../models/types";

export function mapToAutomation(testCases: TestCase[], framework: AutomationFramework): Array<{
  title: string;
  framework: AutomationFramework;
  code: string;
}> {
  if (framework === "selenium") {
    return testCases.map((tc) => ({
      title: tc.title,
      framework,
      code: toSelenium(tc)
    }));
  }
  return testCases.map((tc) => ({
    title: tc.title,
    framework,
    code: toPlaywright(tc)
  }));
}

function toPlaywright(tc: TestCase): string {
  return `import { test, expect } from '@playwright/test';

test('${escape(tc.title)}', async ({ page }) => {
  // TODO: Replace with actual env URL
  await page.goto('https://example.com');
  // Steps: ${escape(tc.steps.join(" | "))}
  await expect(page.locator('body')).toBeVisible();
});`;
}

function toSelenium(tc: TestCase): string {
  return `from selenium import webdriver
from selenium.webdriver.common.by import By

def test_${slug(tc.title)}():
    driver = webdriver.Chrome()
    try:
        driver.get("https://example.com")
        # Steps: ${escape(tc.steps.join(" | "))}
        assert "Login" in driver.title
    finally:
        driver.quit()`;
}

function escape(v: string): string {
  return v.replace(/'/g, "\\'");
}

function slug(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
