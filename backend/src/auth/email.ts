import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Config } from "../config/env.js";
import { HttpError } from "../http/errors.js";

export async function sendEmail(
  config: Config,
  to: string,
  subject: string,
  text: string,
  html?: string,
) {
  // Seed identities use reserved .test domains, never real inboxes.
  if (config.DEMO_MODE === "1" && to.toLowerCase().endsWith(".test")) return;
  if (config.MAIL_MODE === "file" && config.NODE_ENV !== "production") {
    await mkdir(config.MAIL_DIR, { recursive: true, mode: 0o700 });
    await writeFile(
      join(config.MAIL_DIR, `${randomUUID()}.txt`),
      `To: ${to}\nSubject: ${subject}\n\n${text}`,
      { mode: 0o600 },
    );
    return;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.RESEND_FROM_EMAIL,
        to: [to],
        subject,
        text,
        ...(html && { html }),
      }),
    });
    if (!response.ok) throw new Error("Email rejected");
    const result = (await response.json()) as { id?: string; error?: unknown };
    if (!result.id || result.error) throw new Error("Email rejected");
  } catch {
    throw new HttpError(
      503,
      "EMAIL_UNAVAILABLE",
      "Email could not be sent. Request another email.",
    );
  }
}
