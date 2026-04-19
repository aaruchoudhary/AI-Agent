import { GenerateTestsRequest, GenerateTestsResponse } from "../models/types";
import { mapToAutomation } from "./mappers/automationMapper";
import { getFigmaScreens } from "./providers/figmaProvider";
import { getJiraTicket } from "./providers/jiraProvider";
import { generateTestCases } from "./testGenerator";

export async function runTestingAgent(input: GenerateTestsRequest): Promise<GenerateTestsResponse> {
  const jira = await getJiraTicket(input.jiraTicketId);
  const figmaScreens = await getFigmaScreens(input.figmaFileKey, input.figmaNodeIds ?? []);
  const testCases = await generateTestCases(jira, figmaScreens);

  const automationSnippets =
    input.includeAutomation === true
      ? mapToAutomation(testCases, input.automationFramework ?? "playwright")
      : [];

  return {
    jiraTicketId: input.jiraTicketId,
    testCases,
    automationSnippets
  };
}
