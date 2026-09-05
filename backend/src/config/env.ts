import "dotenv/config";
import { resolve } from "node:path";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().default("127.0.0.1"),
  APP_URL: z.url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default("FlagArena <onboarding@resend.dev>"),
  MAIL_MODE: z
    .enum(["resend", "file"])
    .default(process.env.RESEND_API_KEY ? "resend" : "file"),
  UPLOAD_DIR: z.string().default("../var/uploads"),
  MAIL_DIR: z.string().default("../var/mail"),
  TRUST_PROXY: z.enum(["0", "1"]).default("0"),
  DEMO_MODE: z.enum(["0", "1"]).optional(),
});
export type Config = z.infer<typeof schema>;
export function readConfig(): Config {
  const config = schema.parse(process.env);
  if (
    config.NODE_ENV === "production" &&
    (config.MAIL_MODE !== "resend" || !config.APP_URL.startsWith("https://"))
  ) {
    throw new Error("Production requires HTTPS and Resend delivery");
  }
  if (config.MAIL_MODE === "resend" && !config.RESEND_API_KEY)
    throw new Error("RESEND_API_KEY is required");
  if (config.NODE_ENV === "production" && /^replace_/i.test(config.JWT_SECRET))
    throw new Error(
      "Replace the example JWT secret before starting production",
    );
  config.UPLOAD_DIR = resolve(config.UPLOAD_DIR);
  config.MAIL_DIR = resolve(config.MAIL_DIR);
  return config;
}
