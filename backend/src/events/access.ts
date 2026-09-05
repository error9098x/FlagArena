import type { EntityManager } from "typeorm";
import { EventEntity, type Event, type User } from "../database/entities.js";
import { requireCondition } from "../http/errors.js";

export function eventStatus(
  event: Pick<Event, "status" | "startsAt" | "endsAt">,
  now = new Date(),
) {
  if (event.status !== "scheduled") return event.status;
  if (now < event.startsAt) return "scheduled";
  return now < event.endsAt ? "active" : "ended";
}
export async function requireEventAccess(
  db: EntityManager,
  user: User,
  eventId: string,
  activeOnly = false,
) {
  const event = await db.getRepository(EventEntity).findOneBy({ id: eventId });
  requireCondition(
    event && (user.role === "admin" || event.status !== "draft"),
    404,
    "NOT_FOUND",
    "Event not found",
  );
  if (user.role !== "admin") {
    const registrations = await db.query(
      "SELECT user_id FROM registrations WHERE user_id=$1 AND event_id=$2",
      [user.id, eventId],
    );
    requireCondition(
      registrations.length &&
        event.status !== "draft" &&
        new Date() >= event.startsAt,
      403,
      "EVENT_UNAVAILABLE",
      "Event challenges are unavailable",
    );
  }
  if (activeOnly)
    requireCondition(
      eventStatus(event) === "active",
      403,
      "EVENT_ENDED",
      "Event is not active",
    );
  return event;
}
