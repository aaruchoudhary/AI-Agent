# MCP Integrations for Jira QA Autonomous Agent

## Required Servers
- `plugin-atlassian-atlassian`
  - Use for Jira ticket reads, comments, and worklog updates.
- `plugin-figma-figma`
  - Use for Figma design lookup and UI validation when ticket includes a Figma link.

## Git Integration
- Use local shell access (`git` / `gh`) for:
  - PR or MR discovery from links in Jira
  - changed-files analysis
  - diff-based impact analysis

## Authentication Rules
1. Before first MCP call, verify required servers are available.
2. If a server exposes `mcp_auth`, complete `mcp_auth` before other tool calls.
3. Do not ask users to paste raw tokens in chat when interactive auth is available.
4. If authentication fails or expires, pause workflow and ask user to re-authenticate.

## Workflow Guardrails
- If Jira access is unavailable, stop and request Atlassian MCP authentication.
- If Figma link exists but Figma MCP is unavailable, continue functional QA and clearly mark design validation as blocked.
- Keep traceability across requirements, code/design findings, tests, and Jira updates.
