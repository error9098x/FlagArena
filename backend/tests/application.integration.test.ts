import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { DataSource } from "typeorm";
import bcrypt from "bcrypt";
import { createDataSource } from "../src/config/data-source.js";
import { UserEntity } from "../src/database/entities.js";
import { createApp } from "../src/app.js";
import type {
  AuthSessionDto,
  ChallengeDto,
  EventDto,
  ScoreHistoryDto,
} from "@flagarena/shared";

const connection = process.env.TEST_DATABASE_URL;
describe.skipIf(!connection)("Real application workflows", () => {
  let control: DataSource,
    db: DataSource,
    server: Server,
    url: string,
    directory: string;
  let admin: AuthSessionDto, player: AuthSessionDto, author: AuthSessionDto;
  let adminCookie: string, playerCookie: string, temporaryPassword: string;
  let challenge: ChallengeDto, event: EventDto;
  const schema = `flagarena_test_${randomUUID().replaceAll("-", "")}`;
  let schemaCreated = false;
  const password = "Local-test-only-123!";

  async function request<T = Record<string, unknown>>(
    path: string,
    method = "GET",
    body?: unknown,
    session?: AuthSessionDto,
    cookie?: string,
  ) {
    const response = await fetch(`${url}/api${path}`, {
      method,
      headers: {
        ...(body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body:
        body instanceof FormData
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
    });
    return {
      status: response.status,
      body: (response.status === 204 ? {} : await response.json()) as T,
      cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "",
    };
  }
  async function mailToken(subject: string, pattern: RegExp) {
    const files = await readdir(join(directory, "mail"));
    for (const file of files.reverse()) {
      const text = await readFile(join(directory, "mail", file), "utf8");
      if (text.includes(`Subject: ${subject}`)) {
        const value = text.match(pattern)?.[1];
        if (value) return value;
      }
    }
    throw new Error("Expected local test email was not delivered");
  }
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "flagarena-workflow-"));
    control = createDataSource(connection!);
    await control.initialize();
    await control.query(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    const options = createDataSource(connection!).options;
    if (options.type !== "postgres") throw new Error("PostgreSQL required");
    db = new DataSource({
      ...options,
      schema,
      extra: { max: 10, options: `-c search_path=${schema}` },
    });
    await db.initialize();
    await db.runMigrations();
    await db.getRepository(UserEntity).insert({
      id: randomUUID(),
      email: "admin@example.test",
      username: "Test admin",
      role: "admin",
      isVerified: true,
      passwordHash: await bcrypt.hash(password, 12),
    });
    server = createApp(db, {
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      PORT: 4000,
      APP_URL: "http://localhost:5173",
      DATABASE_URL: connection!,
      JWT_SECRET: "test-only-secret-not-for-deployment-12345",
      MAIL_MODE: "file",
      MAIL_DIR: join(directory, "mail"),
      UPLOAD_DIR: join(directory, "uploads"),
      RESEND_FROM_EMAIL: "test@example.test",
      TRUST_PROXY: "0",
    }).listen(0, "127.0.0.1");
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const login = await request<AuthSessionDto>("/auth/admin/login", "POST", {
      email: "admin@example.test",
      password,
    });
    expect(login.status).toBe(200);
    admin = login.body;
    adminCookie = login.cookie;
  }, 30000);
  afterAll(async () => {
    if (server?.listening)
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    if (db?.isInitialized) await db.destroy();
    if (control?.isInitialized) {
      if (schemaCreated && /^flagarena_test_[a-f0-9]{32}$/.test(schema))
        await control.query(`DROP SCHEMA "${schema}" CASCADE`);
      await control.destroy();
    }
    if (directory?.startsWith(join(tmpdir(), "flagarena-workflow-")))
      await rm(directory, { recursive: true, force: true });
  });

  it("registers and verifies players without leaking verification material", async () => {
    const input = {
      email: "Player@Example.test",
      username: "Test player",
      password,
    };
    expect((await request("/auth/register", "POST", input)).status).toBe(201);
    expect((await request("/auth/register", "POST", input)).status).toBe(409);
    expect((await request("/auth/login", "POST", input)).status).toBe(403);
    const code = await mailToken("Verify your email", /code is (\d{6})/);
    expect(
      (
        await request("/auth/verify", "POST", {
          email: input.email,
          code: code === "000000" ? "111111" : "000000",
        })
      ).status,
    ).toBe(400);
    const [attempts] = await db.query(
      "SELECT attempts FROM verification_codes",
    );
    expect(attempts.attempts).toBe(1);
    expect(
      (await request("/auth/verify", "POST", { email: input.email, code }))
        .status,
    ).toBe(200);
    expect(
      (await request("/auth/verify", "POST", { email: input.email, code }))
        .status,
    ).toBe(400);
    const login = await request<AuthSessionDto>("/auth/login", "POST", input);
    expect(login.status).toBe(200);
    player = login.body;
    playerCookie = login.cookie;
    expect(player.user).not.toHaveProperty("passwordHash");
    expect((await request("/auth/admin/login", "POST", input)).status).toBe(
      401,
    );
    expect(
      (await request("/admin/users", "GET", undefined, player)).status,
    ).toBe(403);
  });
  it("creates authors, rejects duplicate emails and requires password replacement", async () => {
    const input = {
      email: "Author@Example.test",
      username: "Test author",
      role: "author",
    };
    const created = await request<{ temporaryPassword: string }>(
      "/admin/users",
      "POST",
      input,
      admin,
    );
    expect(created.status).toBe(201);
    temporaryPassword = created.body.temporaryPassword;
    expect(
      (await request("/admin/users", "POST", input, admin)).body.code,
    ).toBe("EMAIL_EXISTS");
    const login = await request<AuthSessionDto>("/auth/login", "POST", {
      email: input.email,
      password: temporaryPassword,
    });
    author = login.body;
    expect(author.user.isVerified).toBe(true);
    expect(author.user.mustChangePassword).toBe(true);
    expect(
      (await request("/challenges", "GET", undefined, author)).body.code,
    ).toBe("PASSWORD_CHANGE_REQUIRED");
    expect(
      (
        await request(
          "/auth/change-password",
          "POST",
          { currentPassword: temporaryPassword, newPassword: password },
          author,
        )
      ).status,
    ).toBe(200);
    expect((await request("/auth/me", "GET", undefined, author)).status).toBe(
      401,
    );
    author = (
      await request<AuthSessionDto>("/auth/login", "POST", {
        email: input.email,
        password,
      })
    ).body;
    expect(
      (
        await request(
          `/admin/users/${admin.user.id}`,
          "PATCH",
          { role: "player", isSuspended: false, reason: "Test last admin" },
          admin,
        )
      ).body.code,
    ).toBe("LAST_ADMIN");
  });
  it("uploads resources, approves challenges, scores solves and supports reviews", async () => {
    const input = {
      title: "Workflow challenge",
      description: "Read this harmless local file and find the supplied flag.",
      category: "misc",
      difficulty: "easy",
      visibility: "public_practice",
      basePoints: 100,
      flag: "flagarena{workflow}",
      hints: [{ content: "Read the file", cost: 10 }],
      links: [
        { label: "External asset", url: "https://example.com/asset.txt" },
      ],
    };
    const created = await request<ChallengeDto>(
      "/challenges",
      "POST",
      input,
      author,
    );
    expect(created.status).toBe(201);
    challenge = created.body;
    const file = new FormData();
    file.set("file", new Blob(["flagarena{workflow}"]), "puzzle.txt");
    const uploaded = await request<{ id: string }>(
      `/challenges/${challenge.id}/resources`,
      "POST",
      file,
      author,
    );
    expect(uploaded.status).toBe(201);
    expect(
      (await request(`/challenges/${challenge.id}`, "GET", undefined, player))
        .status,
    ).toBe(404);
    expect(
      (
        await request(
          `/challenges/${challenge.id}/submit-review`,
          "POST",
          {},
          author,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await request(
          `/challenges/${challenge.id}/moderate`,
          "POST",
          { status: "approved" },
          admin,
        )
      ).status,
    ).toBe(200);
    expect(
      (await request(`/challenges/${challenge.id}`, "PUT", input, author))
        .status,
    ).toBe(403);
    const downloaded = await fetch(
      `${url}/api/resources/${uploaded.body.id}/download`,
      { headers: { Authorization: `Bearer ${player.accessToken}` } },
    );
    expect(downloaded.status).toBe(200);
    expect(await downloaded.text()).toBe("flagarena{workflow}");
    expect(downloaded.headers.get("content-disposition")).toContain(
      "attachment",
    );
    const detail = await request<ChallengeDto>(
      `/challenges/${challenge.id}`,
      "GET",
      undefined,
      player,
    );
    expect(detail.body.hints[0]!.content).toBeNull();
    expect(
      (
        await request(
          `/challenges/${challenge.id}/hints/${challenge.hints[0]!.id}/unlock`,
          "POST",
          {},
          player,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await request(
          `/challenges/${challenge.id}/submissions`,
          "POST",
          { flag: input.flag },
          player,
        )
      ).body.pointsAwarded,
    ).toBe(90);
    expect(
      (
        await request(
          `/challenges/${challenge.id}/submissions`,
          "POST",
          { flag: input.flag },
          author,
        )
      ).body.code,
    ).toBe("OWN_CHALLENGE");
    expect(
      (
        await request(
          `/challenges/${challenge.id}/review`,
          "PUT",
          { rating: 5, comment: "Clear resource" },
          player,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await request(
          `/challenges/${challenge.id}/my-review`,
          "GET",
          undefined,
          player,
        )
      ).body.canReview,
    ).toBe(true);
    expect((await request("/public/home")).body).not.toHaveProperty("flagHash");
  });
  it("runs invite-only events with real score history and preserves ended results", async () => {
    const created = await request<EventDto>(
      "/events",
      "POST",
      {
        title: "Workflow event",
        description: "Private event for workflow testing.",
        startsAt: new Date(Date.now() + 60000).toISOString(),
        endsAt: new Date(Date.now() + 3600000).toISOString(),
        status: "scheduled",
        access: "invite_only",
        joinCode: "test-code",
        dynamicScoring: true,
        challengeIds: [challenge.id],
      },
      admin,
    );
    expect(created.status).toBe(201);
    event = created.body;
    expect(
      (
        await request(
          `/events/${event.id}/join`,
          "POST",
          { code: "wrong" },
          player,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await request(
          `/events/${event.id}/join`,
          "POST",
          { code: "test-code" },
          player,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await request(
          `/leaderboard/history?eventId=${event.id}`,
          "GET",
          undefined,
          player,
        )
      ).status,
    ).toBe(403);
    await db.query(
      "UPDATE events SET starts_at=now()-interval '1 minute' WHERE id=$1",
      [event.id],
    );
    expect(
      (
        await request(
          `/challenges/${challenge.id}/submissions`,
          "POST",
          { flag: "flagarena{workflow}", eventId: event.id },
          player,
        )
      ).body.pointsAwarded,
    ).toBe(90);
    const history = await request<ScoreHistoryDto>(
      `/leaderboard/history?eventId=${event.id}`,
      "GET",
      undefined,
      player,
    );
    expect(history.status).toBe(200);
    expect(history.body.me?.points).toBe(90);
    expect(history.body.points.at(-1)?.scores[player.user.id]).toBe(90);
    expect(history.body.live).toBe(true);
    expect(
      (
        await request(
          `/leaderboard/history?eventId=${event.id}&players=${Array(7).fill(player.user.id).join(",")}`,
          "GET",
          undefined,
          player,
        )
      ).status,
    ).toBe(400);
    await db.query(
      "UPDATE events SET ends_at=now()-interval '1 second' WHERE id=$1",
      [event.id],
    );
    expect(
      (
        await request<ScoreHistoryDto>(
          `/leaderboard/history?eventId=${event.id}`,
          "GET",
          undefined,
          player,
        )
      ).body.live,
    ).toBe(false);
    expect(
      (
        await request(
          `/challenges/${challenge.id}/submissions`,
          "POST",
          { flag: "flagarena{workflow}", eventId: event.id },
          player,
        )
      ).status,
    ).toBe(403);
  });
  it("recovers passwords with single-use links and revokes old sessions", async () => {
    expect(
      (
        await request("/auth/forgot-password", "POST", {
          email: player.user.email,
        })
      ).status,
    ).toBe(200);
    const token = await mailToken(
      "Reset your password",
      /reset-password#([a-f0-9]{64})/,
    );
    expect(
      (
        await request("/auth/reset-password", "POST", {
          token,
          password: "Replacement-test-123!",
        })
      ).status,
    ).toBe(200);
    expect((await request("/auth/me", "GET", undefined, player)).status).toBe(
      401,
    );
    expect(
      (await request("/auth/refresh", "POST", {}, undefined, playerCookie))
        .status,
    ).toBe(401);
    expect(
      (await request("/auth/reset-password", "POST", { token, password }))
        .status,
    ).toBe(400);
    expect(
      (
        await request("/auth/login", "POST", {
          email: player.user.email,
          password: "Replacement-test-123!",
        })
      ).status,
    ).toBe(200);
  });
  it("enforces the 100 MiB upload boundary", async () => {
    const created = await request<ChallengeDto>(
      "/challenges",
      "POST",
      {
        title: "Upload boundary",
        description: "A harmless resource size boundary test.",
        category: "misc",
        difficulty: "easy",
        visibility: "event_only",
        basePoints: 100,
        flag: "test-boundary",
      },
      author,
    );
    expect(created.status).toBe(201);
    for (const extra of [0, 1]) {
      const form = new FormData();
      form.set(
        "file",
        new Blob([new Uint8Array(100 * 1024 * 1024 + extra)]),
        "boundary.bin",
      );
      const response = await request(
        `/challenges/${created.body.id}/resources`,
        "POST",
        form,
        author,
      );
      expect(response.status).toBe(extra ? 413 : 201);
    }
  }, 30000);
  it("rotates refresh cookies and revokes a replayed session family", async () => {
    const refreshed = await request<AuthSessionDto>(
      "/auth/refresh",
      "POST",
      {},
      undefined,
      adminCookie,
    );
    expect(refreshed.status).toBe(200);
    expect((await request("/auth/me", "GET", undefined, admin)).status).toBe(
      401,
    );
    expect(
      (await request("/auth/refresh", "POST", {}, undefined, adminCookie))
        .status,
    ).toBe(401);
    expect(
      (await request("/auth/me", "GET", undefined, refreshed.body)).status,
    ).toBe(401);
  });
});
