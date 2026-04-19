export type TestType = "Functional" | "UI" | "Edge" | "Negative";
export type Priority = "P0" | "P1" | "P2" | "P3";
export type AutomationFramework = "playwright" | "selenium";

export interface JiraTicket {
  ticketId: string;
  summary: string;
  description: string;
  acceptanceCriteria: string[];
  comments: string[];
}

export interface FigmaElement {
  elementId: string;
  name: string;
  elementType: string;
  text?: string;
}

export interface FigmaScreen {
  nodeId: string;
  name: string;
  elements: FigmaElement[];
}

export interface TestCase {
  title: string;
  description: string;
  preconditions: string[];
  steps: string[];
  expectedResult: string;
  type: TestType;
  priority: Priority;
  tags: string[];
  jiraTicketId: string;
}

export interface GenerateTestsRequest {
  jiraTicketId: string;
  figmaFileKey?: string;
  figmaNodeIds?: string[];
  includeAutomation?: boolean;
  automationFramework?: AutomationFramework;
}

export interface GenerateTestsResponse {
  jiraTicketId: string;
  testCases: TestCase[];
  automationSnippets: Array<{ title: string; framework: AutomationFramework; code: string }>;
}
