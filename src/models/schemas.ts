import { z } from "zod";

export const generateTestsSchema = z.object({
  jiraTicketId: z.string().min(1),
  figmaFileKey: z.string().optional(),
  figmaNodeIds: z.array(z.string()).optional(),
  includeAutomation: z.boolean().optional().default(false),
  automationFramework: z.enum(["playwright", "selenium"]).optional().default("playwright")
});
