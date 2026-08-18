import * as z from "zod";

export const demoAiAppEnvSchema = z.object({
  OPENAI_API_KEY: z.string({
    error: "OPENAI_API_KEY is required for the demo AI app",
  }),
  OPENAI_ANIMATION_MODEL: z.string().min(1).default("gpt-5.4-mini"),
});
