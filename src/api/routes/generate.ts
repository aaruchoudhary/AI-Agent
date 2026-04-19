import { Router } from "express";

import { generateTestsSchema } from "../../models/schemas";
import { runTestingAgent } from "../../services/agentOrchestrator";

export const generateRouter = Router();

generateRouter.post("/generate-tests", async (req, res) => {
  try {
    const parsed = generateTestsSchema.parse(req.body);
    const result = await runTestingAgent(parsed);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({
      error: "Failed to generate test cases",
      detail: error?.message ?? "Unknown error"
    });
  }
});
