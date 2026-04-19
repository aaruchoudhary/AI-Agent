---
name: jira-qa-autonomous-agent
description: Autonomous QA workflow for Jira tasks with MCP integrations for Jira, Git, and Figma. Use when user provides a Jira ticket ID and expects end-to-end test design, QA3 execution flow, Allure reporting, and Jira worklog updates.
---

# Jira QA Autonomous Agent

## Purpose
Execute a complete QA lifecycle from a Jira ticket ID:
- requirement extraction
- code-change impact analysis
- design validation
- test case generation
- QA3 execution workflow
- Allure-style reporting
- Jira worklog update

## Inputs
- Jira ticket ID from user
- MCP authentication readiness for required servers

## MCP Integration Reference
Use [mcps.md](mcps.md) for all MCP server, authentication, and Git integration rules.

## Execution Workflow

1. **Fetch task details**
   - Read Jira ticket details using the provided ID.
   - Collect: description, comments, worklogs.
   - Extract:
     - requirements
     - acceptance criteria
     - edge cases mentioned by product/dev/QA comments

2. **Analyze code changes**
   - From Jira worklog/comments, identify merge request or PR link.
   - Fetch changed files and summarize functional impact.
   - Identify newly introduced edge cases and regression-prone areas.

3. **Validate design when Figma exists**
   - If ticket contains Figma link, compare implementation with design intent.
   - Validate:
     - layout consistency
     - styling consistency
     - component behavior differences
   - Record UI mismatches as findings.

4. **Generate test cases**
   - Build cases from requirements + code changes + design validation.
   - Always include:
     - positive scenarios
     - negative scenarios
     - edge cases
     - regression impact scenarios
   - Use markdown output by default.
   - For automation mapping, default to Selenium unless user overrides.

5. **Deploy flow to QA3**
   - Prepare merge/deploy readiness notes for QA3.
   - Notify user exactly:
     - "Please trigger the Jenkins build."
   - Stop and wait for explicit user confirmation before test execution.

6. **Execute tests on QA3**
   - After build confirmation, execute test scenarios on:
     - https://storefront.v4.qa3.angara.com/
   - Perform:
     - functional checks
     - UI validation (if design present)
     - focused regression checks

7. **Generate Allure-style report**
   - Produce report including:
     - passed/failed scenarios
     - logs
     - screenshots (if captured)
     - defect summary with severity

8. **Update Jira**
   - Add Jira worklog/update with:
     - time spent
     - testing summary
     - Allure report link
     - defects found and references

## Non-Negotiable Rules
- Use configured MCP authentication for Jira/Figma and shell-based Git access.
- Keep strict traceability: requirements -> code/design -> test cases -> results.
- Do not execute tests on QA3 before Jenkins build confirmation from user.
- If data is missing (MR link, Figma access, build status), ask for that item explicitly.

## Response Format
When running this workflow, structure updates in this order:
1. ticket understanding
2. code/design impact findings
3. test cases
4. execution status
5. report summary
6. Jira update status

## Checklist
Use [checklist.md](checklist.md) as a step tracker during execution.
