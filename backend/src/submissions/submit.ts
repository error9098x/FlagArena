import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import type { SubmissionOutcomeDto } from "@flagarena/shared";
import { SUBMISSION_LIMITS } from "@flagarena/shared";
import {
  ChallengeEntity,
  EventEntity,
  type User,
} from "../database/entities.js";
import { compareSecret } from "../auth/secrets.js";
import { HttpError, requireCondition } from "../http/errors.js";
import { lockUser, requireCompetitor } from "../challenges/access.js";
import { eventStatus } from "../events/access.js";
import { scoreValue } from "./scoring.js";
import { audit } from "../database/audit.js";

export async function submitFlag(
  db: DataSource,
  actor: User,
  challengeId: string,
  flag: string,
  eventId?: string,
): Promise<SubmissionOutcomeDto> {
  return db.transaction(async (manager) => {
    const user = await lockUser(manager, actor.id);
    requireCompetitor(user);
    let dynamic = false;
    let endsAt: Date | undefined;
    if (eventId) {
      const event = await manager.getRepository(EventEntity).findOne({
        where: { id: eventId },
        lock: { mode: "pessimistic_write" },
      });
      requireCondition(
        event && eventStatus(event) === "active",
        403,
        "EVENT_UNAVAILABLE",
        "Event is not active",
      );
      const selected = await manager.query(
        "SELECT challenge_id FROM event_challenges WHERE event_id=$1 AND challenge_id=$2",
        [eventId, challengeId],
      );
      const registration = await manager.query(
        "SELECT user_id FROM registrations WHERE event_id=$1 AND user_id=$2",
        [eventId, user.id],
      );
      requireCondition(
        selected.length && registration.length,
        403,
        "EVENT_UNAVAILABLE",
        "Join the event before submitting",
      );
      dynamic = event.dynamicScoring;
      endsAt = event.endsAt;
    }
    // Every scoring context locks this row before counting solves and recording an award.
    const challenge = await manager
      .getRepository(ChallengeEntity)
      .createQueryBuilder("challenge")
      .addSelect("challenge.flagHash")
      .where("challenge.id=:id", { id: challengeId })
      .setLock("pessimistic_write")
      .getOne();
    requireCondition(
      challenge?.status === "approved" &&
        (eventId || challenge.visibility === "public_practice"),
      404,
      "NOT_FOUND",
      "Challenge not found",
    );
    requireCompetitor(user, challenge.authorId);
    const context = eventId ?? "practice";
    const [existing] = await manager.query(
      "SELECT id FROM solves WHERE user_id=$1 AND challenge_id=$2 AND context_key=$3",
      [user.id, challengeId, context],
    );
    if (existing)
      return {
        result: "already_solved",
        pointsAwarded: 0,
        attemptsRemaining: 8,
        lockedUntil: null,
      };
    await manager.query(
      "INSERT INTO attempt_state(user_id,challenge_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [user.id, challengeId],
    );
    const [attempt] = await manager.query(
      "SELECT * FROM attempt_state WHERE user_id=$1 AND challenge_id=$2 FOR UPDATE",
      [user.id, challengeId],
    );
    const now = new Date();
    if (attempt.locked_until && attempt.locked_until > now)
      throw new HttpError(
        429,
        "FLAG_LOCKED",
        "Flag submissions are temporarily locked",
        Math.ceil((attempt.locked_until.getTime() - now.getTime()) / 1000),
      );
    const expired =
      now.getTime() - attempt.window_started_at.getTime() >=
        SUBMISSION_LIMITS.ATTEMPT_WINDOW_SECONDS * 1000 ||
      Boolean(attempt.locked_until);
    let wrong = expired ? 0 : attempt.wrong_attempts;
    const windowStart = expired ? now : attempt.window_started_at;
    const correct = await compareSecret(flag.trim(), challenge.flagHash);
    requireCondition(
      !endsAt || new Date() < endsAt,
      403,
      "EVENT_ENDED",
      "Event has ended",
    );
    const submissionId = randomUUID();
    await manager.query(
      "INSERT INTO submissions(id,user_id,challenge_id,event_id,result) VALUES($1,$2,$3,$4,$5)",
      [
        submissionId,
        user.id,
        challengeId,
        eventId ?? null,
        correct ? "correct" : "incorrect",
      ],
    );
    if (eventId)
      await manager.query(
        "UPDATE registrations SET attended_at=coalesce(attended_at,now()) WHERE user_id=$1 AND event_id=$2",
        [user.id, eventId],
      );
    if (!correct) {
      wrong += 1;
      const lockedUntil =
        wrong >= SUBMISSION_LIMITS.MAX_WRONG_ATTEMPTS
          ? new Date(now.getTime() + SUBMISSION_LIMITS.LOCKOUT_SECONDS * 1000)
          : null;
      await manager.query(
        "UPDATE attempt_state SET wrong_attempts=$3,window_started_at=$4,locked_until=$5 WHERE user_id=$1 AND challenge_id=$2",
        [user.id, challengeId, wrong, windowStart, lockedUntil],
      );
      if (lockedUntil)
        await audit(manager, user.id, "submission.locked", challengeId);
      return {
        result: "incorrect",
        pointsAwarded: 0,
        attemptsRemaining: Math.max(0, 8 - wrong),
        lockedUntil: lockedUntil?.toISOString() ?? null,
      };
    }
    const [solves] = await manager.query(
      "SELECT count(*)::int AS count FROM solves WHERE challenge_id=$1 AND context_key=$2 AND NOT invalidated",
      [challengeId, context],
    );
    const [hints] = await manager.query(
      "SELECT coalesce(sum(hu.cost),0)::int AS cost FROM hint_unlocks hu JOIN hints h ON h.id=hu.hint_id WHERE hu.user_id=$1 AND h.challenge_id=$2",
      [user.id, challengeId],
    );
    const points = scoreValue(
      challenge.basePoints,
      solves.count,
      dynamic,
      hints.cost,
    );
    await manager.query(
      "INSERT INTO solves(id,submission_id,user_id,challenge_id,event_id,context_key,points,original_points) VALUES($1,$2,$3,$4,$5,$6,$7,$7)",
      [
        randomUUID(),
        submissionId,
        user.id,
        challengeId,
        eventId ?? null,
        context,
        points,
      ],
    );
    await manager.query(
      "UPDATE attempt_state SET wrong_attempts=0,locked_until=NULL,window_started_at=now() WHERE user_id=$1 AND challenge_id=$2",
      [user.id, challengeId],
    );
    return {
      result: "correct",
      pointsAwarded: points,
      attemptsRemaining: 8,
      lockedUntil: null,
    };
  });
}
