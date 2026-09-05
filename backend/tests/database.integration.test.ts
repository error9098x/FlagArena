import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DataSource } from "typeorm";
import { createDataSource } from "../src/config/data-source.js";
import {
  ChallengeEntity,
  EventEntity,
  UserEntity,
  type User,
} from "../src/database/entities.js";
import { hashSecret } from "../src/auth/secrets.js";
import { submitFlag } from "../src/submissions/submit.js";
import { challengeDetail } from "../src/challenges/queries.js";
import { leaderboardSql } from "../src/leaderboard/queries.js";

const connection = process.env.TEST_DATABASE_URL;
describe.skipIf(!connection)(
  "PostgreSQL transactions in an isolated test schema",
  () => {
    const schema = `flagarena_test_${randomUUID().replaceAll("-", "")}`;
    let admin: DataSource;
    let db: DataSource;
    let players: User[];
    let author: User;
    let challengeId: string;
    let eventId: string;
    let flagHash: string;
    let schemaCreated = false;

    beforeAll(async () => {
      admin = createDataSource(connection!);
      await admin.initialize();
      await admin.query(`CREATE SCHEMA "${schema}"`);
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
      flagHash = await hashSecret("flagarena{transaction_test}");
    }, 30000);

    beforeEach(async () => {
      players = [];
      for (const role of ["author", "player", "player"] as const) {
        const userId = randomUUID();
        await db.getRepository(UserEntity).insert({
          id: userId,
          username: role,
          email: `${userId}@example.test`,
          passwordHash: flagHash,
          role,
          isVerified: true,
        });
        const user = await db
          .getRepository(UserEntity)
          .findOneByOrFail({ id: userId });
        if (role === "author") author = user;
        else players.push(user);
      }
      challengeId = randomUUID();
      await db.getRepository(ChallengeEntity).insert({
        id: challengeId,
        authorId: author.id,
        title: "Transaction test",
        description: "A harmless test of transaction integrity.",
        category: "misc",
        difficulty: "easy",
        status: "approved",
        visibility: "public_practice",
        basePoints: 100,
        flagHash,
        connectionInfo: "",
        approvedBy: author.id,
        approvedAt: new Date(),
        releasedAt: new Date(),
      });
      eventId = randomUUID();
      await db.getRepository(EventEntity).insert({
        id: eventId,
        title: "Transaction event",
        description: "Testing independent scoring contexts.",
        rules: "",
        startsAt: new Date(Date.now() - 60000),
        endsAt: new Date(Date.now() + 60000),
        status: "scheduled",
        access: "open",
        dynamicScoring: true,
      });
      await db.query(
        "INSERT INTO event_challenges(event_id,challenge_id) VALUES($1,$2)",
        [eventId, challengeId],
      );
      for (const user of players)
        await db.query(
          "INSERT INTO registrations(user_id,event_id) VALUES($1,$2)",
          [user.id, eventId],
        );
    });

    afterAll(async () => {
      if (db?.isInitialized) await db.destroy();
      if (admin?.isInitialized) {
        // Only this suite's freshly generated schema is removed.
        if (!/^flagarena_test_[a-f0-9]{32}$/.test(schema))
          throw new Error("Invalid test schema");
        if (schemaCreated) await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
        await admin.destroy();
      }
    });

    it("awards a concurrent duplicate only once", async () => {
      const results = await Promise.all([
        submitFlag(db, players[0]!, challengeId, "flagarena{transaction_test}"),
        submitFlag(db, players[0]!, challengeId, "flagarena{transaction_test}"),
      ]);
      expect(results.map((result) => result.result).sort()).toEqual([
        "already_solved",
        "correct",
      ]);
      const [row] = await db.query(
        "SELECT count(*)::int AS count,sum(points)::int AS points FROM solves WHERE challenge_id=$1",
        [challengeId],
      );
      expect(row).toEqual({ count: 1, points: 100 });
    });
    it("isolates practice from event scoring and serializes dynamic awards", async () => {
      await submitFlag(
        db,
        players[0]!,
        challengeId,
        "flagarena{transaction_test}",
      );
      const results = await Promise.all(
        players.map((player) =>
          submitFlag(
            db,
            player,
            challengeId,
            "flagarena{transaction_test}",
            eventId,
          ),
        ),
      );
      expect(
        results.map((result) => result.pointsAwarded).sort((a, b) => a - b),
      ).toEqual([95, 100]);
      const practice = await db.query(`${leaderboardSql} HAVING u.id=$2`, [
        "practice",
        players[0]!.id,
      ]);
      expect(practice[0].points).toBe(100);
      const [attendance] = await db.query(
        "SELECT count(*)::int AS count FROM registrations WHERE event_id=$1 AND attended_at IS NOT NULL",
        [eventId],
      );
      expect(attendance.count).toBe(2);
    });
    it("persists wrong attempts and counts wrong submissions as attendance", async () => {
      for (let attempt = 0; attempt < 8; attempt++)
        await submitFlag(db, players[0]!, challengeId, "incorrect", eventId);
      await expect(
        submitFlag(
          db,
          players[0]!,
          challengeId,
          "flagarena{transaction_test}",
          eventId,
        ),
      ).rejects.toMatchObject({ code: "FLAG_LOCKED" });
      const [row] = await db.query(
        "SELECT wrong_attempts,locked_until FROM attempt_state WHERE user_id=$1 AND challenge_id=$2",
        [players[0]!.id, challengeId],
      );
      expect(row.wrong_attempts).toBe(8);
      expect(row.locked_until).toBeInstanceOf(Date);
      const [registration] = await db.query(
        "SELECT attended_at FROM registrations WHERE user_id=$1 AND event_id=$2",
        [players[0]!.id, eventId],
      );
      expect(registration.attended_at).toBeInstanceOf(Date);
      const other = await submitFlag(
        db,
        players[1]!,
        challengeId,
        "flagarena{transaction_test}",
        eventId,
      );
      expect(other.result).toBe("correct");
    });
    it("uses durable hint costs and never returns verifier material", async () => {
      const hintId = randomUUID();
      await db.query(
        "INSERT INTO hints(id,challenge_id,position,content,cost) VALUES($1,$2,0,'Private hint',30)",
        [hintId, challengeId],
      );
      const hidden = await challengeDetail(
        db.manager,
        players[0]!,
        challengeId,
      );
      expect(hidden).not.toHaveProperty("flagHash");
      expect(hidden.hints[0]?.content).toBeNull();
      await db.query(
        "INSERT INTO hint_unlocks(user_id,hint_id,cost) VALUES($1,$2,30)",
        [players[0]!.id, hintId],
      );
      expect(
        (
          await submitFlag(
            db,
            players[0]!,
            challengeId,
            "flagarena{transaction_test}",
          )
        ).pointsAwarded,
      ).toBe(70);
      expect(
        (await challengeDetail(db.manager, players[0]!, challengeId)).hints[0]
          ?.content,
      ).toBe("Private hint");
    });
    it("rejects self-authored scoring and hidden event content", async () => {
      await expect(
        submitFlag(db, author, challengeId, "flagarena{transaction_test}"),
      ).rejects.toMatchObject({ code: "OWN_CHALLENGE" });
      await db
        .getRepository(ChallengeEntity)
        .update(challengeId, { visibility: "event_only" });
      await expect(
        challengeDetail(db.manager, players[0]!, challengeId),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        challengeDetail(db.manager, players[0]!, challengeId, eventId),
      ).resolves.toMatchObject({ id: challengeId });
      await db
        .getRepository(EventEntity)
        .update(eventId, { endsAt: new Date(Date.now() - 1000) });
      await expect(
        challengeDetail(db.manager, players[0]!, challengeId, eventId),
      ).rejects.toMatchObject({ code: "EVENT_ENDED" });
      await expect(
        submitFlag(
          db,
          players[0]!,
          challengeId,
          "flagarena{transaction_test}",
          eventId,
        ),
      ).rejects.toMatchObject({ code: "EVENT_UNAVAILABLE" });
    });
    it("keeps failed solve transactions from retaining a successful submission", async () => {
      await db.query(
        `CREATE FUNCTION reject_test_solve() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test rollback'; END; $$`,
      );
      await db.query(
        `CREATE TRIGGER reject_test_solve BEFORE INSERT ON solves FOR EACH ROW EXECUTE FUNCTION reject_test_solve()`,
      );
      try {
        await expect(
          submitFlag(
            db,
            players[0]!,
            challengeId,
            "flagarena{transaction_test}",
            eventId,
          ),
        ).rejects.toThrow();
        const [row] = await db.query(
          "SELECT count(*)::int AS count FROM submissions WHERE challenge_id=$1",
          [challengeId],
        );
        expect(row.count).toBe(0);
        const [registration] = await db.query(
          "SELECT attended_at FROM registrations WHERE user_id=$1 AND event_id=$2",
          [players[0]!.id, eventId],
        );
        expect(registration.attended_at).toBeNull();
      } finally {
        await db.query("DROP TRIGGER reject_test_solve ON solves");
        await db.query("DROP FUNCTION reject_test_solve()");
      }
    });
  },
);
