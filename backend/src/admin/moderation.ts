import { Router } from "express";
import type { DataSource } from "typeorm";
import { correctScoreSchema, paginationSchema } from "@flagarena/shared";
import { currentUser, routeId } from "../http/request.js";
import { requireCondition } from "../http/errors.js";
import { audit } from "../database/audit.js";
import { lockUser } from "../challenges/access.js";

export function moderationRoutes(db: DataSource) {
  const router = Router();
  router.get("/audit", async (req, res) => {
    const { page, limit } = paginationSchema.parse(req.query);
    const [count] = await db.query(
      "SELECT count(*)::int AS total FROM audit_log",
    );
    const items = await db.query(
      `SELECT a.id,coalesce(u.username,'Setup') AS "actorName",a.action,a.target_id AS "targetId",a.reason,a.created_at AS "createdAt"
      FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, (page - 1) * limit],
    );
    res.json({ items, total: count.total, page, limit });
  });
  router.get("/solves", async (req, res) => {
    const { page, limit } = paginationSchema.parse(req.query);
    const [count] = await db.query("SELECT count(*)::int AS total FROM solves");
    const items = await db.query(
      `SELECT s.id,u.username,c.title,s.context_key AS context,s.points,s.original_points AS "originalPoints",s.invalidated,s.created_at AS "createdAt"
      FROM solves s JOIN users u ON u.id=s.user_id JOIN challenges c ON c.id=s.challenge_id ORDER BY s.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, (page - 1) * limit],
    );
    res.json({ items, total: count.total, page, limit });
  });
  router.patch("/solves/:id", async (req, res) => {
    const input = correctScoreSchema.parse(req.body);
    const id = routeId(req);
    await db.transaction(async (manager) => {
      const actor = await lockUser(manager, currentUser(req).id);
      requireCondition(
        actor.role === "admin",
        403,
        "FORBIDDEN",
        "Access denied",
      );
      const [solve] = await manager.query(
        "SELECT challenge_id FROM solves WHERE id=$1",
        [id],
      );
      requireCondition(solve, 404, "NOT_FOUND", "Solve not found");
      await manager.query("SELECT id FROM challenges WHERE id=$1 FOR UPDATE", [
        solve.challenge_id,
      ]);
      await manager.query(
        "UPDATE solves SET points=$2,invalidated=$3 WHERE id=$1",
        [id, input.points, input.invalidated],
      );
      await audit(
        manager,
        actor.id,
        "solve.corrected",
        id,
        `${input.reason}; points=${input.points}; invalidated=${input.invalidated}`,
      );
    });
    res.json({ message: "Score corrected" });
  });
  return router;
}
