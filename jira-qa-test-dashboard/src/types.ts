import { z } from "zod";

export const PlaywrightStepSchema = z.object({
  action: z.enum([
    "goto",
    "click",
    "fill",
    "expectVisible",
    "expectHidden",
    "expectText",
    "expectTitleContains",
    "waitForTimeout",
  ]),
  /** CSS selector (except goto / expectTitleContains / waitForTimeout) */
  selector: z.string().optional(),
  /** For goto: path (e.g. /cart) or full URL */
  url: z.string().optional(),
  /** For fill */
  value: z.string().optional(),
  /** For expectText */
  text: z.string().optional(),
  /** ms for waitForTimeout */
  ms: z.number().optional(),
});

export const TestCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["positive", "negative", "edge", "regression"]).default("positive"),
  /** Verbatim or lightly trimmed excerpt from the ticket this case validates */
  requirementTrace: z.string().optional(),
  preconditions: z.string().optional(),
  /** Clear pass/fail criterion in plain language */
  expectedResult: z.string().optional(),
  /** Human-readable steps for reporting */
  narrativeSteps: z.array(z.string()).optional(),
  /** Machine steps executed against baseUrl */
  playwrightSteps: z.array(PlaywrightStepSchema),
});

export type PlaywrightStep = z.infer<typeof PlaywrightStepSchema>;
export type TestCase = z.infer<typeof TestCaseSchema>;

export type ExecutionResult = {
  testId: string;
  title: string;
  status: "passed" | "failed" | "skipped";
  durationMs: number;
  error?: string;
  stepIndex?: number;
};
