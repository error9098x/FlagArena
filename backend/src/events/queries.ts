import type { EntityManager } from "typeorm";
import { EventEntity, type User } from "../database/entities.js";
import { eventStatus } from "./access.js";
import { requireCondition } from "../http/errors.js";
import type { EventDto } from "@flagarena/shared";

export async function eventDetail(
  db: EntityManager,
  user: User,
  id: string,
): Promise<EventDto> {
  const event = await db.getRepository(EventEntity).findOneBy({ id });
  requireCondition(
    event && (event.status !== "draft" || user.role === "admin"),
    404,
    "NOT_FOUND",
    "Event not found",
  );
  const [participation] = await db.query(
    `SELECT count(*)::int AS count,coalesce(bool_or(user_id=$2),false) AS registered FROM registrations WHERE event_id=$1`,
    [id, user.id],
  );
  const visible =
    user.role === "admin" ||
    (participation.registered && eventStatus(event) === "active");
  const challenges = visible
    ? await db.query(
        "SELECT challenge_id FROM event_challenges WHERE event_id=$1 ORDER BY challenge_id",
        [id],
      )
    : [];
  return {
    id,
    title: event.title,
    description: event.description,
    rules: event.rules,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    status: eventStatus(event),
    access: event.access,
    dynamicScoring: event.dynamicScoring,
    registered: participation.registered,
    participantCount: participation.count,
    challengeIds: challenges.map(
      (row: { challenge_id: string }) => row.challenge_id,
    ),
  };
}
