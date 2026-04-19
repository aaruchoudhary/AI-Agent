type AdfNode = {
  type?: string;
  text?: string;
  content?: AdfNode[];
};

function adfToPlainText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node !== "object") return "";
  const n = node as AdfNode;
  if (n.text) return n.text;
  if (!Array.isArray(n.content)) return "";
  return n.content.map((c) => adfToPlainText(c)).join("");
}

function descriptionToText(description: unknown): string {
  if (description == null) return "";
  if (typeof description === "string") return description;
  if (typeof description !== "object") return String(description);
  const d = description as { type?: string; content?: unknown[] };
  if (d.type === "doc" && Array.isArray(d.content)) {
    return d.content
      .map((block) => {
        const t = adfToPlainText(block).trim();
        return t;
      })
      .filter(Boolean)
      .join("\n\n");
  }
  return JSON.stringify(description);
}

export type JiraIssuePayload = {
  key: string;
  summary: string;
  descriptionText: string;
  status?: string;
  issueType?: string;
  url: string;
};

export async function fetchJiraIssue(
  host: string,
  email: string,
  token: string,
  issueKey: string,
): Promise<JiraIssuePayload> {
  const base = host.replace(/\/$/, "");
  const key = issueKey.trim().toUpperCase();
  const auth = Buffer.from(`${email}:${token}`).toString("base64");
  const url = `${base}/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,description,status,issuetype`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jira ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    key: string;
    fields: {
      summary?: string;
      description?: unknown;
      status?: { name?: string };
      issuetype?: { name?: string };
    };
  };

  const descriptionText = descriptionToText(data.fields.description);

  return {
    key: data.key,
    summary: data.fields.summary ?? "",
    descriptionText,
    status: data.fields.status?.name,
    issueType: data.fields.issuetype?.name,
    url: `${base}/browse/${data.key}`,
  };
}
