import { Router } from "express";
import type { DataSource } from "typeorm";
import { challengeQuerySchema, paginationSchema } from "@flagarena/shared";
import { currentUser } from "../http/request.js";
import { practiceStats } from "../leaderboard/queries.js";
import { eventDetail } from "../events/queries.js";
import { listChallenges } from "../challenges/queries.js";

export function dashboardRoutes(db: DataSource) {
  const router = Router();
  router.get("/", async (req, res) => {
    const user = currentUser(req);
    const admin = user.role === "admin";
    const author = user.role === "author";
    const stats: { label: string; value: number }[] = [];
    if (admin) {
      const counts = await db.query(
        "SELECT role,is_suspended,count(*)::int AS count FROM users GROUP BY role,is_suspended",
      );
      for (const role of ["player", "author", "admin"])
        stats.push({
          label:
            role === "player"
              ? "Players"
              : role === "author"
                ? "Authors"
                : "Admins",
          value: counts
            .filter((row: { role: string }) => row.role === role)
            .reduce(
              (sum: number, row: { count: number }) => sum + row.count,
              0,
            ),
        });
      stats.push({
        label: "Suspended",
        value: counts
          .filter((row: { is_suspended: boolean }) => row.is_suspended)
          .reduce((sum: number, row: { count: number }) => sum + row.count, 0),
      });
      const [challenges] = await db.query(
        "SELECT count(*) FILTER(WHERE status='pending')::int AS pending,count(*) FILTER(WHERE status='approved')::int AS published FROM challenges",
      );
      stats.push(
        { label: "Pending reviews", value: challenges.pending },
        { label: "Published challenges", value: challenges.published },
      );
    } else {
      const progress = await practiceStats(db.manager, user.id);
      const [attempts] = await db.query(
        "SELECT count(DISTINCT challenge_id)::int AS count FROM submissions WHERE user_id=$1",
        [user.id],
      );
      stats.push(
        { label: "Practice score", value: progress.points },
        { label: "Practice rank", value: progress.rank },
        { label: "Practice solves", value: progress.solveCount },
        { label: "Attempted", value: attempts.count },
      );
    }
    const activity = await db.query(
      `SELECT s.id,s.challenge_id AS "challengeId",c.title,s.event_id AS "eventId",s.result,coalesce(v.points,0) AS points,s.created_at AS "createdAt"
      FROM submissions s JOIN challenges c ON c.id=s.challenge_id LEFT JOIN solves v ON v.submission_id=s.id AND NOT v.invalidated
      WHERE ($2 OR s.user_id=$1) ORDER BY s.created_at DESC LIMIT 10`,
      [user.id, admin],
    );
    const scoreHistory = await db.query(
      `SELECT day AS date,sum(points) OVER (ORDER BY day)::int AS points FROM
      (SELECT to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD') AS day,sum(points)::int AS points
      FROM solves WHERE user_id=$1 AND context_key='practice' AND NOT invalidated GROUP BY day) daily ORDER BY day`,
      [user.id],
    );
    const eventRows = await db.query(
      `SELECT e.id FROM events e WHERE ($2 AND e.status<>'archived') OR
      (e.status='scheduled' AND e.ends_at>now()) OR
      EXISTS(SELECT 1 FROM registrations r WHERE r.user_id=$1 AND r.event_id=e.id)
      ORDER BY (e.status='scheduled' AND e.ends_at>now()) DESC,e.starts_at DESC LIMIT 8`,
      [user.id, admin],
    );
    const events = await Promise.all(
      eventRows.map((row: { id: string }) =>
        eventDetail(db.manager, user, row.id),
      ),
    );
    const challenges =
      admin || author
        ? (
            await listChallenges(
              db.manager,
              user,
              challengeQuerySchema.parse({
                view: "manage",
                ...(admin ? { status: "pending" } : {}),
                limit: 8,
              }),
            )
          ).items
        : [];
    const hints = await db.query(
      `SELECT c.title,h.content,hu.cost FROM hint_unlocks hu JOIN hints h ON h.id=hu.hint_id JOIN challenges c ON c.id=h.challenge_id
      WHERE hu.user_id=$1 ORDER BY hu.created_at DESC LIMIT 10`,
      [user.id],
    );
    const audit = admin
      ? await db.query(`SELECT a.id,coalesce(u.username,'Setup') AS "actorName",a.action,a.target_id AS "targetId",a.reason,a.created_at AS "createdAt"
      FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 8`)
      : [];
    res.json({
      stats,
      activity,
      scoreHistory,
      events,
      challenges,
      hints,
      audit,
    });
  });
  router.get("/activity", async (req, res) => {
    const { page, limit } = paginationSchema.parse(req.query);
    const user = currentUser(req);
    const params = [user.id, user.role === "admin"];
    const [count] = await db.query(
      "SELECT count(*)::int AS total FROM submissions WHERE user_id=$1 OR $2",
      params,
    );
    const items = await db.query(
      `SELECT s.id,s.challenge_id AS "challengeId",c.title,s.event_id AS "eventId",s.result,coalesce(v.points,0) AS points,s.created_at AS "createdAt"
      FROM submissions s JOIN challenges c ON c.id=s.challenge_id LEFT JOIN solves v ON v.submission_id=s.id AND NOT v.invalidated
      WHERE s.user_id=$1 OR $2 ORDER BY s.created_at DESC LIMIT $3 OFFSET $4`,
      [...params, limit, (page - 1) * limit],
    );
    res.json({ items, total: count.total, page, limit });
  });
  router.get("/author-analytics", async (req, res) => {
    const user = currentUser(req);
    const { page, limit } = paginationSchema.parse(req.query);
    const [count] = await db.query(
      "SELECT count(*)::int AS total FROM challenges WHERE author_id=$1",
      [user.id],
    );
    const items = await db.query(
      `SELECT c.id,c.title,c.status,
      (SELECT count(*)::int FROM submissions s WHERE s.challenge_id=c.id) AS attempts,
      (SELECT count(*)::int FROM solves s WHERE s.challenge_id=c.id AND NOT invalidated) AS solves,
      (SELECT round(avg(rating),1)::float FROM reviews r WHERE r.challenge_id=c.id AND NOT hidden) AS rating
      FROM challenges c WHERE c.author_id=$1 ORDER BY c.created_at DESC LIMIT $2 OFFSET $3`,
      [user.id, limit, (page - 1) * limit],
    );
    res.json({ items, total: count.total, page, limit });
  });
  return router;
}
