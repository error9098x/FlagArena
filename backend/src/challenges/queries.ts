import type { EntityManager } from "typeorm";
import { challengeQuerySchema, type ChallengeDto } from "@flagarena/shared";
import type { z } from "zod";
import type { User } from "../database/entities.js";
import { requireCondition } from "../http/errors.js";
import { requireEventAccess } from "../events/access.js";
import { visibleChallenge } from "./access.js";
import { scoreValue } from "../submissions/scoring.js";

const selection = `SELECT c.id,c.title,c.description,c.category,c.difficulty,c.status,c.visibility,
  c.base_points AS "basePoints",c.author_id AS "authorId",u.username AS "authorName",
  c.connection_info AS "connectionInfo",c.rejection_reason AS "rejectionReason",c.created_at AS "createdAt",c.released_at AS "releasedAt",
  (SELECT count(*)::int FROM solves s WHERE s.challenge_id=c.id AND s.context_key=$2 AND NOT s.invalidated) AS "solveCount",
  EXISTS(SELECT 1 FROM solves s WHERE s.challenge_id=c.id AND s.user_id=$1 AND s.context_key=$2 AND NOT s.invalidated) AS "solvedByMe",
  (SELECT round(avg(r.rating),1)::float FROM reviews r WHERE r.challenge_id=c.id AND NOT r.hidden) AS "averageRating",
  (SELECT count(*)::int FROM reviews r WHERE r.challenge_id=c.id AND NOT r.hidden) AS "reviewCount"
  FROM challenges c JOIN users u ON u.id=c.author_id`;

export async function challengeDetail(
  db: EntityManager,
  user: User,
  id: string,
  eventId?: string,
): Promise<ChallengeDto> {
  await visibleChallenge(db, user, id, eventId);
  const [challenge] = await db.query(`${selection} WHERE c.id=$3`, [
    user.id,
    eventId ?? "practice",
    id,
  ]);
  const privileged =
    user.role === "admin" ||
    (user.role === "author" && user.id === challenge.authorId);
  challenge.resources = await db.query(
    "SELECT id,label,url,filename,size::float FROM resources WHERE challenge_id=$1 ORDER BY label",
    [id],
  );
  challenge.hints = await db.query(
    `SELECT h.id,h.position,h.cost,(hu.user_id IS NOT NULL) AS unlocked,
    CASE WHEN hu.user_id IS NOT NULL OR $3 THEN h.content ELSE NULL END AS content
    FROM hints h LEFT JOIN hint_unlocks hu ON hu.hint_id=h.id AND hu.user_id=$1 WHERE h.challenge_id=$2 ORDER BY h.position`,
    [user.id, id, privileged],
  );
  const [event] = eventId
    ? await db.query("SELECT dynamic_scoring FROM events WHERE id=$1", [
        eventId,
      ])
    : [];
  challenge.currentPoints = scoreValue(
    challenge.basePoints,
    challenge.solveCount,
    Boolean(event?.dynamic_scoring),
  );
  return challenge;
}

export async function listChallenges(
  db: EntityManager,
  user: User,
  query: z.infer<typeof challengeQuerySchema>,
) {
  const { page, limit, eventId } = query;
  const params: unknown[] = [user.id, eventId ?? "practice"];
  const conditions: string[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    conditions.push(sql.replace("?", `$${params.length}`));
  };
  if (query.view === "manage") {
    requireCondition(user.role !== "player", 403, "FORBIDDEN", "Access denied");
    if (user.role === "author") add("c.author_id=?", user.id);
  } else {
    conditions.push("c.status='approved'");
    if (eventId) {
      await requireEventAccess(db, user, eventId, user.role !== "admin");
      add(
        "EXISTS(SELECT 1 FROM event_challenges ec WHERE ec.challenge_id=c.id AND ec.event_id=?)",
        eventId,
      );
    } else conditions.push("c.visibility='public_practice'");
  }
  if (query.search) add("c.title ILIKE ?", `%${query.search}%`);
  if (query.category) add("c.category=?", query.category);
  if (query.difficulty) add("c.difficulty=?", query.difficulty);
  if (query.visibility) add("c.visibility=?", query.visibility);
  if (query.status) add("c.status=?", query.status);
  if (query.authorId) add("c.author_id=?", query.authorId);
  if (query.minPoints !== undefined) add("c.base_points>=?", query.minPoints);
  if (query.maxPoints !== undefined) add("c.base_points<=?", query.maxPoints);
  if (query.used)
    conditions.push(
      `${query.used === "false" ? "NOT " : ""}EXISTS(SELECT 1 FROM event_challenges ec WHERE ec.challenge_id=c.id)`,
    );
  const outer: string[] = [];
  if (query.minSolves !== undefined) {
    params.push(query.minSolves);
    outer.push(`"solveCount">=$${params.length}`);
  }
  if (query.maxSolves !== undefined) {
    params.push(query.maxSolves);
    outer.push(`"solveCount"<=$${params.length}`);
  }
  if (query.solved)
    outer.push(`"solvedByMe"=${query.solved === "true" ? "true" : "false"}`);
  const sql = `FROM (${selection}${conditions.length ? ` WHERE ${conditions.join(" AND ")}` : ""}) catalog${outer.length ? ` WHERE ${outer.join(" AND ")}` : ""}`;
  const [count] = await db.query(
    `SELECT count(*)::int AS total ${sql}`,
    params,
  );
  const sort = {
    createdAt: '"createdAt"',
    points: '"basePoints"',
    solveCount: '"solveCount"',
    title: "title",
  }[query.sortBy];
  const rows = await db.query(
    `SELECT * ${sql} ORDER BY ${sort} ${query.sortOrder === "asc" ? "ASC" : "DESC"},id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit],
  );
  const [event] = eventId
    ? await db.query("SELECT dynamic_scoring FROM events WHERE id=$1", [
        eventId,
      ])
    : [];
  return {
    items: rows.map((row: ChallengeDto) => ({
      ...row,
      resources: [],
      hints: [],
      currentPoints: scoreValue(
        row.basePoints,
        row.solveCount,
        Boolean(event?.dynamic_scoring),
      ),
    })),
    total: count.total,
    page,
    limit,
  };
}
