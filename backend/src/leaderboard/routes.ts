import { Router } from "express";
import type { DataSource } from "typeorm";
import { leaderboardSql } from "./queries.js";
import { contextSchema, paginationSchema } from "@flagarena/shared";
import { currentUser } from "../http/request.js";
import { requireEventAccess } from "../events/access.js";
import { z } from "zod";
import { scoreHistory } from "./history.js";

export function leaderboardRoutes(db: DataSource) {
  const router = Router();
  router.get("/history", async (req, res) => {
    const { eventId } = contextSchema.parse(req.query);
    const selected = z
      .string()
      .transform((value) => value.split(","))
      .pipe(z.array(z.uuid()).min(1).max(6))
      .optional()
      .parse(req.query.players);
    const event = eventId
      ? await requireEventAccess(db.manager, currentUser(req), eventId)
      : undefined;
    res.json(
      await scoreHistory(
        db.manager,
        eventId ?? "practice",
        currentUser(req).id,
        selected,
        event?.startsAt,
        event?.endsAt,
      ),
    );
  });
  router.get("/", async (req, res) => {
    const { eventId } = contextSchema.parse(req.query);
    const { page, limit } = paginationSchema.parse(req.query);
    const search = z
      .string()
      .trim()
      .max(32)
      .default("")
      .parse(req.query.search);
    if (eventId)
      await requireEventAccess(db.manager, currentUser(req), eventId);
    const [count] = await db.query(
      `SELECT count(*)::int AS total FROM (${leaderboardSql}) board WHERE strpos(lower(username),lower($2))>0`,
      [eventId ?? "practice", search],
    );
    const items = await db.query(
      `SELECT * FROM (${leaderboardSql}) board WHERE strpos(lower(username),lower($4))>0 ORDER BY rank LIMIT $2 OFFSET $3`,
      [eventId ?? "practice", limit, (page - 1) * limit, search],
    );
    res.json({ items, total: count.total, page, limit });
  });
  return router;
}
