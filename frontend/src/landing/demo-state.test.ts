import { describe, expect, it } from "vitest";
import { demoReducer, demoScore, seedDemo } from "./demo-state";
const at = "2026-09-05T12:00:00Z";
describe("independent preview scenarios", () => {
  it("starts with twelve challenges, seven categories and existing solves", () => {
    const state = seedDemo("player");
    expect(state.challenges).toHaveLength(40);
    expect(new Set(state.challenges.map((c) => c.id)).size).toBe(40);
    expect(
      state.challenges.filter((c) => c.visibility === "public_practice"),
    ).toHaveLength(20);
    expect(
      state.challenges.filter((c) => c.visibility === "event_only"),
    ).toHaveLength(20);
    expect(new Set(state.challenges.map((c) => c.category)).size).toBe(7);
    expect(state.attempts.length).toBeGreaterThan(0);
    expect(state.challenges.every((c) => c.status === "approved")).toBe(true);
  });
  it("does not share author edits with the player scenario", () => {
    const player = seedDemo("player");
    const author = seedDemo("author");
    const updated = demoReducer(author, {
      type: "save",
      challenge: { ...author.challenges[0]!, title: "Author revision" },
      at,
    });
    expect(updated.challenges.find((c) => c.id === "headers")?.title).toBe(
      "Author revision",
    );
    expect(player.challenges[0]?.title).toBe("Header inspection");
    expect(seedDemo("author").challenges[0]?.title).toBe("Header inspection");
  });
  it("awards points once and records incorrect flags", () => {
    let state = seedDemo();
    const initial = demoScore(state);
    const submit = (flag: string) => {
      state = demoReducer(state, {
        type: "submit",
        id: "headers",
        flag,
        attemptId: String(state.attempts.length),
        at,
      });
    };
    submit("wrong");
    expect(demoScore(state)).toBe(initial);
    submit("flagarena{look_at_the_headers}");
    submit("flagarena{look_at_the_headers}");
    expect(demoScore(state)).toBe(initial + 150);
  });
  it("keeps event scores separate and requires registration", () => {
    let state = seedDemo();
    const action = {
      type: "submit" as const,
      id: "headers",
      flag: "flagarena{look_at_the_headers}",
      attemptId: "event-solve",
      at,
      eventId: "midnight",
    };
    expect(demoReducer(state, action)).toBe(state);
    state = demoReducer(state, { type: "join", id: "midnight" });
    const practice = demoScore(state);
    state = demoReducer(state, action);
    expect(demoScore(state)).toBe(practice);
    expect(demoScore(state, "midnight")).toBe(150);
  });
  it("limits user management and review actions to admins", () => {
    const player = seedDemo();
    expect(
      demoReducer(player, {
        type: "user",
        user: { ...player.users[0]!, suspended: true },
        at,
      }),
    ).toBe(player);
    const admin = seedDemo("admin");
    const updated = demoReducer(admin, {
      type: "user",
      user: { ...admin.users[0]!, suspended: true },
      at,
    });
    expect(updated.users[0]?.suspended).toBe(true);
    expect(seedDemo("player").users[0]?.suspended).toBe(false);
    const reviewed = demoReducer(admin, {
      type: "review",
      id: "sector",
      approve: true,
      reason: "",
      at,
    });
    expect(reviewed.challenges.find((c) => c.id === "sector")?.status).toBe(
      "approved",
    );
  });
});
