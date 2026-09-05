import { Router } from "express";
import type { DataSource } from "typeorm";

export function publicRoutes(db: DataSource) {
  const router = Router();
  router.get("/home", async (_req, res) => {
    const challenges =
      await db.query(`SELECT id,title,category,difficulty,base_points AS "basePoints"
      FROM challenges WHERE status='approved' AND visibility='public_practice'
      ORDER BY released_at DESC,id LIMIT 3`);
    const events =
      await db.query(`SELECT id,title,starts_at AS "startsAt",ends_at AS "endsAt",dynamic_scoring AS "dynamicScoring"
      FROM events WHERE status='scheduled' AND access='open' AND ends_at>now()
      ORDER BY starts_at,id LIMIT 3`);
    res.json({ challenges, events });
  });
  return router;
}
