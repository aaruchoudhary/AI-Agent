import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 8000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  jiraBaseUrl: process.env.JIRA_BASE_URL ?? "",
  jiraEmail: process.env.JIRA_EMAIL ?? "",
  jiraApiToken: process.env.JIRA_API_TOKEN ?? "",
  figmaAccessToken: process.env.FIGMA_ACCESS_TOKEN ?? ""
};
