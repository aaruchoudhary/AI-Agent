import OpenAI from "openai";

import { config } from "../core/config";
import { FigmaScreen, JiraTicket, TestCase } from "../models/types";
import { buildTestPrompt } from "../prompts/testCasePrompt";

const openai = new OpenAI({ apiKey: config.openAiApiKey });

export async function generateTestCases(jira: JiraTicket, figmaScreens: FigmaScreen[]): Promise<TestCase[]> {
  if (!config.openAiApiKey) {
    return fallbackCases(jira.ticketId);
  }

  const prompt = buildTestPrompt(jira, figmaScreens);
  const response = await openai.responses.create({
    model: config.openAiModel,
    input: prompt
  });

  const raw = response.output_text ?? "{}";
  const parsed = JSON.parse(raw) as { testCases?: Omit<TestCase, "jiraTicketId">[] };
  const cases = parsed.testCases ?? [];

  return cases.map((t) => ({ ...t, jiraTicketId: jira.ticketId }));
}

function fallbackCases(ticketId: string): TestCase[] {
  return [
    {
      title: "Login succeeds with valid credentials",
      description: "Verify account user can log in using valid credentials.",
      preconditions: ["User exists", "User is on login screen"],
      steps: ["Enter valid email", "Enter valid password", "Click Sign In"],
      expectedResult: "User is logged in and redirected to dashboard.",
      type: "Functional",
      priority: "P0",
      tags: ["auth", "smoke"],
      jiraTicketId: ticketId
    },
    {
      title: "Invalid password shows error",
      description: "Ensure wrong password blocks login with clear feedback.",
      preconditions: ["User exists", "User is on login screen"],
      steps: ["Enter valid email", "Enter invalid password", "Click Sign In"],
      expectedResult: "Error is shown and login does not proceed.",
      type: "Negative",
      priority: "P1",
      tags: ["auth", "negative"],
      jiraTicketId: ticketId
    }
  ];
}
