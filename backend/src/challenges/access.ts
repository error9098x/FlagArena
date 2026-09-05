import type { EntityManager } from "typeorm";
import {
  ChallengeEntity,
  UserEntity,
  type User,
  type Challenge,
} from "../database/entities.js";
import { requireCondition } from "../http/errors.js";
import { requireEventAccess } from "../events/access.js";

export function requireCompetitor(user: User, authorId?: string) {
  requireCondition(
    user.role !== "admin",
    403,
    "ADMIN_CANNOT_COMPETE",
    "Use a Player account to participate",
  );
  requireCondition(
    user.id !== authorId,
    403,
    "OWN_CHALLENGE",
    "Authors cannot score their own challenges",
  );
}
export function canEditChallenge(user: User, challenge: Challenge) {
  return (
    (user.role === "admin" ||
      (user.role === "author" && user.id === challenge.authorId)) &&
    ["draft", "rejected"].includes(challenge.status) &&
    !challenge.releasedAt
  );
}
export async function lockUser(db: EntityManager, id: string): Promise<User> {
  const user = await db
    .getRepository(UserEntity)
    .findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
  requireCondition(
    user && !user.isSuspended && user.isVerified && !user.mustChangePassword,
    403,
    "ACCOUNT_UNAVAILABLE",
    "Account unavailable",
  );
  return user;
}
export async function visibleChallenge(
  db: EntityManager,
  user: User,
  id: string,
  eventId?: string,
) {
  const challenge = await db.getRepository(ChallengeEntity).findOneBy({ id });
  requireCondition(challenge, 404, "NOT_FOUND", "Challenge not found");
  if (
    user.role === "admin" ||
    (user.role === "author" && challenge.authorId === user.id)
  )
    return challenge;
  requireCondition(
    challenge.status === "approved",
    404,
    "NOT_FOUND",
    "Challenge not found",
  );
  if (eventId) {
    await requireEventAccess(db, user, eventId, true);
    const selected = await db.query(
      "SELECT challenge_id FROM event_challenges WHERE event_id=$1 AND challenge_id=$2",
      [eventId, id],
    );
    requireCondition(selected.length, 404, "NOT_FOUND", "Challenge not found");
  } else
    requireCondition(
      challenge.visibility === "public_practice",
      404,
      "NOT_FOUND",
      "Challenge not found",
    );
  return challenge;
}
