import { afterEach, describe, expect, it, vi } from "vitest";
import type { Config } from "../src/config/env.js";
import { sendEmail } from "../src/auth/email.js";

const config: Config = {
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: 4000,
  APP_URL: "https://arena.example.test",
  DATABASE_URL: "not-connected",
  JWT_SECRET: "test-only-secret-not-for-deployment-12345",
  MAIL_MODE: "resend",
  RESEND_API_KEY: "test-only-placeholder-key",
  RESEND_FROM_EMAIL: "Arena <verify@example.test>",
  MAIL_DIR: "/unused",
  UPLOAD_DIR: "/unused",
  TRUST_PROXY: "0",
};

afterEach(() => vi.unstubAllGlobals());

describe("Resend delivery boundary without external requests", () => {
  it("never delivers mail to seeded identities on a demo deployment", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await sendEmail(
      { ...config, DEMO_MODE: "1" },
      "player@example.test",
      "Test",
      "Test",
    );
    await sendEmail(
      { ...config, DEMO_MODE: "1" },
      "asha.iyer@flagarena.test",
      "Test",
      "Test",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("sends the configured sender, recipient and plain text with authentication", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ id: "example-email-id" }));
    vi.stubGlobal("fetch", fetchMock);
    await sendEmail(
      config,
      "player@example.test",
      "Verify your email",
      "Test body",
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(request).toMatchObject({
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
    });
    expect(request?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(request?.body))).toEqual({
      from: config.RESEND_FROM_EMAIL,
      to: ["player@example.test"],
      subject: "Verify your email",
      text: "Test body",
    });
  });

  it.each([
    [
      "provider rejection",
      () =>
        Response.json({ message: "Private provider details" }, { status: 403 }),
    ],
    ["missing delivery identifier", () => Response.json({})],
    ["malformed response", () => new Response("not JSON")],
  ] as const)(
    "handles %s without exposing provider details",
    async (_, response) => {
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>().mockResolvedValue(response()),
      );
      await expect(
        sendEmail(config, "player@example.test", "Test", "Test body"),
      ).rejects.toMatchObject({
        status: 503,
        code: "EMAIL_UNAVAILABLE",
        message: "Email could not be sent. Request another email.",
      });
    },
  );

  it("handles network failure without silently falling back to local files", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockRejectedValue(new Error("Private network details")),
    );
    await expect(
      sendEmail(config, "player@example.test", "Test", "Test body"),
    ).rejects.toMatchObject({ status: 503, code: "EMAIL_UNAVAILABLE" });
  });
});
