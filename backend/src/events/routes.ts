import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { DataSource } from "typeorm";
import {
  createEventSchema,
  eventQuerySchema,
  joinEventSchema,
  rotateCodeSchema,
} from "@flagarena/shared";
import { EventEntity } from "../database/entities.js";
import { currentUser, routeId } from "../http/request.js";
import { requireCondition } from "../http/errors.js";
import { roles } from "../auth/sessions.js";
import { hashSecret, compareSecret } from "../auth/secrets.js";
import { consumeLimit } from "../auth/rate-limit.js";
import { audit } from "../database/audit.js";
import { requireCompetitor, lockUser } from "../challenges/access.js";
import { eventDetail } from "./queries.js";

export function eventRoutes(db: DataSource) {
  const router = Router();
  router.get("/", async (req, res) => {
    const { page, limit, scope } = eventQuerySchema.parse(req.query);
    const user = currentUser(req);
    const filters = [user.role === "admin" ? "TRUE" : "status<>'draft'"];
    if (scope === "upcoming")
      filters.push("status='scheduled' AND starts_at>now()");
    if (scope === "live")
      filters.push("status='scheduled' AND starts_at<=now() AND ends_at>now()");
    if (scope === "past") filters.push("(ends_at<=now() OR status='archived')");
    const where = filters.join(" AND ");
    const [count] = await db.query(
      `SELECT count(*)::int AS total FROM events WHERE ${where}`,
    );
    const rows = await db.query(
      `SELECT id FROM events WHERE ${where} ORDER BY starts_at DESC,id LIMIT $1 OFFSET $2`,
      [limit, (page - 1) * limit],
    );
    res.json({
      items: await Promise.all(
        rows.map((row: { id: string }) =>
          eventDetail(db.manager, user, row.id),
        ),
      ),
      total: count.total,
      page,
      limit,
    });
  });
  router.get("/:id", async (req, res) =>
    res.json(await eventDetail(db.manager, currentUser(req), routeId(req))),
  );
  router.post("/", roles("admin"), async (req, res) => {
    const input = createEventSchema.parse(req.body);
    const id = randomUUID();
    requireCondition(
      input.status !== "archived",
      400,
      "INVALID_STATE",
      "Create a draft or scheduled event",
    );
    requireCondition(
      new Date(input.startsAt) > new Date(),
      400,
      "INVALID_WINDOW",
      "Choose a future start time",
    );
    requireCondition(
      input.access === "open" || input.joinCode,
      400,
      "CODE_REQUIRED",
      "Set a join code",
    );
    await db.transaction(async (manager) => {
      const user = await lockUser(manager, currentUser(req).id);
      requireCondition(
        user.role === "admin",
        403,
        "FORBIDDEN",
        "Access denied",
      );
      const { challengeIds, joinCode, ...fields } = input;
      await manager.getRepository(EventEntity).insert({
        ...fields,
        id,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        joinCodeHash: joinCode ? await hashSecret(joinCode) : null,
      });
      for (const challengeId of [...new Set(challengeIds)].sort()) {
        const [challenge] = await manager.query(
          "SELECT status FROM challenges WHERE id=$1 FOR UPDATE",
          [challengeId],
        );
        requireCondition(
          challenge?.status === "approved",
          400,
          "CHALLENGE_UNAVAILABLE",
          "Select approved challenges",
        );
        await manager.query(
          "INSERT INTO event_challenges(event_id,challenge_id) VALUES($1,$2)",
          [id, challengeId],
        );
      }
      await audit(manager, user.id, "event.created", id);
    });
    res.status(201).json(await eventDetail(db.manager, currentUser(req), id));
  });
  router.put("/:id", roles("admin"), async (req, res) => {
    const input = createEventSchema.parse(req.body);
    const id = routeId(req);
    await db.transaction(async (manager) => {
      const user = await lockUser(manager, currentUser(req).id);
      requireCondition(
        user.role === "admin",
        403,
        "FORBIDDEN",
        "Access denied",
      );
      const event = await manager
        .getRepository(EventEntity)
        .createQueryBuilder("event")
        .addSelect("event.joinCodeHash")
        .where("event.id=:id", { id })
        .setLock("pessimistic_write")
        .getOne();
      requireCondition(
        event && event.status !== "archived",
        404,
        "NOT_FOUND",
        "Event not found",
      );
      requireCondition(
        new Date() < event.startsAt || event.status === "draft",
        409,
        "EVENT_LOCKED",
        "Event configuration is locked after start",
      );
      requireCondition(
        new Date(input.startsAt) > new Date(),
        400,
        "INVALID_WINDOW",
        "Choose a future start time",
      );
      requireCondition(
        input.status !== "archived",
        400,
        "INVALID_STATE",
        "Use the archive action",
      );
      const { challengeIds, joinCode, ...fields } = input;
      const joinCodeHash = joinCode
        ? await hashSecret(joinCode)
        : event.joinCodeHash;
      requireCondition(
        input.access === "open" || joinCodeHash,
        400,
        "CODE_REQUIRED",
        "Set a join code",
      );
      await manager.getRepository(EventEntity).update(id, {
        ...fields,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        joinCodeHash,
      });
      await manager.query("DELETE FROM event_challenges WHERE event_id=$1", [
        id,
      ]);
      for (const challengeId of [...new Set(challengeIds)].sort()) {
        const [challenge] = await manager.query(
          "SELECT status FROM challenges WHERE id=$1 FOR UPDATE",
          [challengeId],
        );
        requireCondition(
          challenge?.status === "approved",
          400,
          "CHALLENGE_UNAVAILABLE",
          "Select approved challenges",
        );
        await manager.query(
          "INSERT INTO event_challenges(event_id,challenge_id) VALUES($1,$2)",
          [id, challengeId],
        );
      }
      await audit(manager, user.id, "event.updated", id);
    });
    res.json(await eventDetail(db.manager, currentUser(req), id));
  });
  router.post("/:id/join", async (req, res) => {
    const { code } = joinEventSchema.parse(req.body);
    const id = routeId(req);
    const user = currentUser(req);
    requireCompetitor(user);
    await consumeLimit(db.manager, `join:${user.id}:${id}`, 8, 900);
    await db.transaction(async (manager) => {
      requireCompetitor(await lockUser(manager, user.id));
      const event = await manager
        .getRepository(EventEntity)
        .createQueryBuilder("event")
        .addSelect("event.joinCodeHash")
        .where("event.id=:id", { id })
        .setLock("pessimistic_write")
        .getOne();
      requireCondition(
        event?.status === "scheduled" && event.endsAt > new Date(),
        403,
        "EVENT_UNAVAILABLE",
        "Event registration is closed",
      );
      if (event.access === "invite_only")
        requireCondition(
          code &&
            event.joinCodeHash &&
            (await compareSecret(code, event.joinCodeHash)),
          403,
          "INVALID_CODE",
          "Incorrect join code",
        );
      await manager.query(
        "INSERT INTO registrations(user_id,event_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [user.id, id],
      );
    });
    res.json({ message: "Event joined" });
  });
  router.post("/:id/rotate-code", roles("admin"), async (req, res) => {
    const { code, reason } = rotateCodeSchema.parse(req.body);
    const id = routeId(req);
    await db.transaction(async (manager) => {
      const user = await lockUser(manager, currentUser(req).id);
      requireCondition(
        user.role === "admin",
        403,
        "FORBIDDEN",
        "Access denied",
      );
      const result = await manager
        .getRepository(EventEntity)
        .update(
          { id, access: "invite_only" },
          { joinCodeHash: await hashSecret(code) },
        );
      requireCondition(
        result.affected,
        404,
        "NOT_FOUND",
        "Invite-only event not found",
      );
      await audit(manager, user.id, "event.code_rotated", id, reason);
    });
    res.json({ message: "Join code changed" });
  });
  router.post("/:id/archive", roles("admin"), async (req, res) => {
    const id = routeId(req);
    await db.transaction(async (manager) => {
      const user = await lockUser(manager, currentUser(req).id);
      requireCondition(
        user.role === "admin",
        403,
        "FORBIDDEN",
        "Access denied",
      );
      const [event] = await manager.query(
        "UPDATE events SET status='archived' WHERE id=$1 AND (ends_at<=now() OR status='draft') RETURNING id",
        [id],
      );
      requireCondition(
        event,
        409,
        "EVENT_ACTIVE",
        "Archive the event after it ends",
      );
      await audit(manager, user.id, "event.archived", id);
    });
    res.json({ message: "Event archived" });
  });
  router.get("/:id/attendance", roles("admin"), async (req, res) => {
    const { page, limit } = eventQuerySchema.parse(req.query);
    const id = routeId(req);
    const [count] = await db.query(
      "SELECT count(*)::int AS total FROM registrations WHERE event_id=$1",
      [id],
    );
    const items = await db.query(
      `SELECT u.id,u.username,r.joined_at AS "joinedAt",r.attended_at AS "attendedAt" FROM registrations r JOIN users u ON u.id=r.user_id WHERE r.event_id=$1 ORDER BY r.joined_at LIMIT $2 OFFSET $3`,
      [id, limit, (page - 1) * limit],
    );
    res.json({ items, total: count.total, page, limit });
  });
  return router;
}
