import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { DataSource } from "typeorm";
import {
  contextSchema,
  createReviewSchema,
  paginationSchema,
  reasonSchema,
} from "@flagarena/shared";
import { currentUser, routeId } from "../http/request.js";
import { requireCondition } from "../http/errors.js";
import {
  visibleChallenge,
  lockUser,
  requireCompetitor,
} from "../challenges/access.js";
import { roles } from "../auth/sessions.js";
import { audit } from "../database/audit.js";

export function reviewRoutes(db: DataSource) {
  const router = Router();
  router.get("/challenges/:id/my-review", async (req, res) => {
    const user = currentUser(req);
    const id = routeId(req);
    const challenge = await visibleChallenge(
      db.manager,
      user,
      id,
      contextSchema.parse(req.query).eventId,
    );
    const [review] = await db.query(
      `SELECT r.id,r.user_id AS "userId",u.username,r.rating,r.comment,r.hidden,r.created_at AS "createdAt"
      FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.challenge_id=$1 AND r.user_id=$2`,
      [id, user.id],
    );
    const solves = await db.query(
      "SELECT id FROM solves WHERE user_id=$1 AND challenge_id=$2 AND NOT invalidated LIMIT 1",
      [user.id, id],
    );
    res.json({
      review: review ?? null,
      canReview:
        user.role !== "admin" &&
        user.id !== challenge.authorId &&
        solves.length > 0,
    });
  });
  router.get("/challenges/:id/reviews", async (req, res) => {
    const id = routeId(req);
    const user = currentUser(req);
    await visibleChallenge(
      db.manager,
      user,
      id,
      contextSchema.parse(req.query).eventId,
    );
    const { page, limit } = paginationSchema.parse(req.query);
    const params = [id, user.role === "admin"];
    const [count] = await db.query(
      "SELECT count(*)::int AS total FROM reviews WHERE challenge_id=$1 AND (NOT hidden OR $2)",
      params,
    );
    const items = await db.query(
      `SELECT r.id,r.user_id AS "userId",u.username,r.rating,r.comment,r.hidden,r.created_at AS "createdAt"
      FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.challenge_id=$1 AND (NOT r.hidden OR $2)
      ORDER BY r.created_at DESC LIMIT $3 OFFSET $4`,
      [...params, limit, (page - 1) * limit],
    );
    res.json({ items, total: count.total, page, limit });
  });
  router.put("/challenges/:id/review", async (req, res) => {
    const id = routeId(req);
    const input = createReviewSchema.parse(req.body);
    const { eventId } = contextSchema.parse(req.query);
    await db.transaction(async (manager) => {
      const user = await lockUser(manager, currentUser(req).id);
      const challenge = await visibleChallenge(manager, user, id, eventId);
      requireCompetitor(user, challenge.authorId);
      await manager.query("SELECT id FROM challenges WHERE id=$1 FOR UPDATE", [
        id,
      ]);
      const solved = await manager.query(
        "SELECT id FROM solves WHERE user_id=$1 AND challenge_id=$2 AND NOT invalidated",
        [user.id, id],
      );
      requireCondition(
        solved.length,
        403,
        "SOLVE_REQUIRED",
        "Solve the challenge before reviewing",
      );
      await manager.query(
        `INSERT INTO reviews(id,user_id,challenge_id,rating,comment) VALUES($1,$2,$3,$4,$5)
        ON CONFLICT(user_id,challenge_id) DO UPDATE SET rating=$4,comment=$5,updated_at=now()`,
        [randomUUID(), user.id, id, input.rating, input.comment],
      );
    });
    res.json({ message: "Review saved" });
  });
  router.delete("/challenges/:id/review", async (req, res) => {
    await db.query("DELETE FROM reviews WHERE user_id=$1 AND challenge_id=$2", [
      currentUser(req).id,
      routeId(req),
    ]);
    res.status(204).end();
  });
  router.post("/reviews/:id/hide", roles("admin"), async (req, res) => {
    const { reason } = reasonSchema.parse(req.body);
    const id = routeId(req);
    await db.transaction(async (manager) => {
      const user = await lockUser(manager, currentUser(req).id);
      requireCondition(
        user.role === "admin",
        403,
        "FORBIDDEN",
        "Access denied",
      );
      const result = await manager.query(
        "UPDATE reviews SET hidden=true WHERE id=$1 RETURNING id",
        [id],
      );
      requireCondition(result.length, 404, "NOT_FOUND", "Review not found");
      await audit(manager, user.id, "review.hidden", id, reason);
    });
    res.json({ message: "Review hidden" });
  });
  return router;
}
