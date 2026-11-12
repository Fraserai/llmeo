import { z } from "zod";

const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@localhost:5432/aus_llmeo?schema=public"),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().min(12).default("dev-secret-change-me"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  OPENAI_API_KEY: optionalSecret,
  OPENAI_MODEL: z.string().trim().min(1).default("gpt-4.1-mini"),
  GEMINI_API_KEY: optionalSecret,
  GEMINI_MODEL: z.string().trim().min(1).default("gemini-2.5-flash"),
  LLMEO_MAX_AUDIT_PROMPTS: z.coerce.number().int().min(1).max(24).default(12),
  LLMEO_USE_MOCK_ENGINES: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  APP_URL: process.env.APP_URL,
  NODE_ENV: process.env.NODE_ENV,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  LLMEO_MAX_AUDIT_PROMPTS: process.env.LLMEO_MAX_AUDIT_PROMPTS,
  LLMEO_USE_MOCK_ENGINES: process.env.LLMEO_USE_MOCK_ENGINES,
});
