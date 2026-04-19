import { FigmaScreen, JiraTicket } from "../models/types";

export function buildTestPrompt(jira: JiraTicket, figmaScreens: FigmaScreen[]): string {
  const uiSummary = figmaScreens
    .map((screen) => {
      const items = screen.elements.slice(0, 25).map((e) => `${e.elementType}:${e.name}`).join(", ");
      return `- ${screen.name} (${screen.nodeId}): ${items}`;
    })
    .join("\n");

  return `
You are a senior QA engineer.
Generate high-quality test cases from Jira and Figma context.

Return strict JSON:
{
  "testCases": [
    {
      "title": "string",
      "description": "string",
      "preconditions": ["string"],
      "steps": ["string"],
      "expectedResult": "string",
      "type": "Functional|UI|Edge|Negative",
      "priority": "P0|P1|P2|P3",
      "tags": ["string"]
    }
  ]
}

Jira:
- ticketId: ${jira.ticketId}
- summary: ${jira.summary}
- description: ${jira.description}
- acceptanceCriteria: ${JSON.stringify(jira.acceptanceCriteria)}
- comments: ${JSON.stringify(jira.comments)}

Figma:
${uiSummary || "- no figma screens"}

Rules:
- cover functional, UI, edge, and negative cases
- include clear expected results
- prioritize critical user flow as P0/P1
`.trim();
}
