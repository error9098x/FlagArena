import { describe, expect, it } from "vitest";
import {
  passwordSchema,
  registerSchema,
  loginSchema,
  verifySchema,
  createEventSchema,
  resourceLinkSchema,
  updateChallengeSchema,
} from "@flagarena/shared";
import { scoreValue } from "../src/submissions/scoring.js";
import { eventStatus } from "../src/events/access.js";
import {
  canEditChallenge,
  requireCompetitor,
} from "../src/challenges/access.js";
import { compareSecret, hashSecret } from "../src/auth/secrets.js";
import { safeFilename } from "../src/challenges/resources.js";
import { publicUser } from "../src/auth/sessions.js";
import type { Challenge, User } from "../src/database/entities.js";

const player: User = {
  id: "player",
  username: "Player",
  email: "p@example.test",
  passwordHash: "never-public",
  role: "player",
  isVerified: true,
  isSuspended: false,
  mustChangePassword: false,
  tokenVersion: 0,
  createdAt: new Date(),
};
describe("scoring", () => {
  it("preserves fixed scoring and deducts hints without negative awards", () => {
    expect(scoreValue(100, 99, false)).toBe(100);
    expect(scoreValue(100, 99, false, 25)).toBe(75);
    expect(scoreValue(100, 0, false, 150)).toBe(0);
  });
  it("uses 5% per previous solve and a 50% floor", () => {
    expect(scoreValue(100, 0, true)).toBe(100);
    expect(scoreValue(100, 1, true)).toBe(95);
    expect(scoreValue(100, 10, true)).toBe(50);
    expect(scoreValue(101, 1, true)).toBe(95);
    expect(scoreValue(101, 99, true)).toBe(51);
    for (let base = 50; base <= 1000; base += 13)
      for (let solves = 0; solves < 30; solves++) {
        const score = scoreValue(base, solves, true);
        expect(score).toBeGreaterThanOrEqual(Math.ceil(base / 2));
        expect(score).toBeLessThanOrEqual(base);
        expect(scoreValue(base, solves + 1, true)).toBeLessThanOrEqual(score);
      }
  });
});
describe("trust boundaries", () => {
  it("normalizes email and does not accept privileged registration", () => {
    const input = registerSchema.parse({
      username: "Player",
      email: " P@Example.Test ",
      password: "safe-password",
      role: "admin",
    });
    expect(input.email).toBe("p@example.test");
    expect(input).not.toHaveProperty("role");
    expect(
      loginSchema.safeParse({ identifier: "Player", password: "safe-password" })
        .success,
    ).toBe(false);
  });
  it("rejects passwords exceeding bcrypt byte capacity and malformed OTPs", () => {
    expect(passwordSchema.safeParse("a".repeat(72)).success).toBe(true);
    expect(passwordSchema.safeParse("a".repeat(73)).success).toBe(false);
    expect(
      loginSchema.safeParse({
        email: "p@example.test",
        password: "a".repeat(73),
      }).success,
    ).toBe(false);
    expect(passwordSchema.safeParse("🙂".repeat(19)).success).toBe(false);
    expect(
      verifySchema.safeParse({ email: "p@example.test", code: "000123" })
        .success,
    ).toBe(true);
    expect(
      verifySchema.safeParse({ email: "p@example.test", code: "12345x" })
        .success,
    ).toBe(false);
  });
  it("allows only HTTPS resource links and strips traversal from filenames", () => {
    expect(
      resourceLinkSchema.safeParse({
        label: "file",
        url: "https://drive.google.com/file",
      }).success,
    ).toBe(true);
    for (const url of [
      "http://example.com",
      "javascript:alert(1)",
      "file:///etc/passwd",
    ])
      expect(resourceLinkSchema.safeParse({ label: "file", url }).success).toBe(
        false,
      );
    expect(safeFilename("../../a.txt")).toBe("a.txt");
    expect(safeFilename("C:\\dir\\file.txt")).toBe("file.txt");
    expect(safeFilename("bad\r\nname.txt")).not.toMatch(/[\r\n]/);
  });
  it("never returns a password hash or token version in user responses", () => {
    expect(publicUser(player)).not.toHaveProperty("passwordHash");
    expect(publicUser(player)).not.toHaveProperty("tokenVersion");
  });
  it("compares the full case-sensitive flag, including suffixes after 72 bytes", async () => {
    const prefix = "x".repeat(100);
    const hash = await hashSecret(prefix + "A");
    expect(await compareSecret(prefix + "A", hash)).toBe(true);
    expect(await compareSecret(prefix + "B", hash)).toBe(false);
    expect(await compareSecret(prefix + "a", hash)).toBe(false);
  });
});
describe("eligibility and lifecycle", () => {
  it("rejects Admin participation and self-authored scoring", () => {
    expect(() => requireCompetitor({ ...player, role: "admin" })).toThrow();
    expect(() =>
      requireCompetitor({ ...player, role: "author" }, player.id),
    ).toThrow();
    expect(() =>
      requireCompetitor({ ...player, role: "author" }, "someone-else"),
    ).not.toThrow();
  });
  it("keeps approved and previously released material immutable", () => {
    const author = { ...player, role: "author" as const };
    const challenge = {
      authorId: player.id,
      status: "draft",
      releasedAt: null,
    } as Challenge;
    expect(canEditChallenge(author, challenge)).toBe(true);
    expect(
      canEditChallenge(author, { ...challenge, authorId: "another" }),
    ).toBe(false);
    expect(canEditChallenge(author, { ...challenge, status: "approved" })).toBe(
      false,
    );
    expect(
      canEditChallenge(author, {
        ...challenge,
        status: "rejected",
        releasedAt: new Date(),
      }),
    ).toBe(false);
    expect(updateChallengeSchema.safeParse({}).success).toBe(false);
  });
  it("treats the start as inclusive and the end as exclusive", () => {
    const event = {
      status: "scheduled" as const,
      startsAt: new Date("2026-09-05T10:00:00Z"),
      endsAt: new Date("2026-09-05T11:00:00Z"),
    };
    expect(eventStatus(event, new Date("2026-09-05T09:59:59Z"))).toBe(
      "scheduled",
    );
    expect(eventStatus(event, event.startsAt)).toBe("active");
    expect(eventStatus(event, event.endsAt)).toBe("ended");
    expect(eventStatus({ ...event, status: "draft" }, event.startsAt)).toBe(
      "draft",
    );
    expect(eventStatus({ ...event, status: "archived" }, event.startsAt)).toBe(
      "archived",
    );
    expect(
      createEventSchema.safeParse({
        title: "Test",
        description: "Event description",
        startsAt: event.endsAt.toISOString(),
        endsAt: event.startsAt.toISOString(),
        status: "scheduled",
        access: "open",
      }).success,
    ).toBe(false);
  });
});
