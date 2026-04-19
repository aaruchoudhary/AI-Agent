import axios from "axios";

import { config } from "../../core/config";
import { JiraTicket } from "../../models/types";

export async function getJiraTicket(ticketId: string): Promise<JiraTicket> {
  if (!config.jiraBaseUrl || !config.jiraEmail || !config.jiraApiToken) {
    return {
      ticketId,
      summary: "Dummy Login Story",
      description: "As a user, I should sign in to access my account dashboard.",
      acceptanceCriteria: [
        "Valid credentials should allow login.",
        "Invalid credentials should show an error message.",
        "Forgot password flow should be accessible."
      ],
      comments: ["UI has email, password and sign-in CTA."]
    };
  }

  const response = await axios.get(
    `${config.jiraBaseUrl}/rest/api/3/issue/${ticketId}?fields=summary,description,comment`,
    {
      auth: { username: config.jiraEmail, password: config.jiraApiToken },
      headers: { Accept: "application/json" }
    }
  );

  const fields = response.data?.fields ?? {};
  const description = flattenAdfText(fields.description);
  const comments = (fields.comment?.comments ?? []).map((c: any) => flattenAdfText(c.body));

  return {
    ticketId,
    summary: fields.summary ?? "",
    description,
    acceptanceCriteria: extractAcceptanceCriteria(description),
    comments
  };
}

function flattenAdfText(adf: any): string {
  if (!adf) return "";
  const chunks: string[] = [];
  const walk = (node: any) => {
    if (node?.text) chunks.push(node.text);
    if (Array.isArray(node?.content)) node.content.forEach(walk);
  };
  walk(adf);
  return chunks.join("\n").trim();
}

function extractAcceptanceCriteria(description: string): string[] {
  const lines = description.split("\n").map((s) => s.trim()).filter(Boolean);
  return lines.filter((line) => /^[-*]|\d+\./.test(line)).map((line) => line.replace(/^[-*]\s*/, ""));
}
