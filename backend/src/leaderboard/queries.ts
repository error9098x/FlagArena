import type { EntityManager } from "typeorm";
export const leaderboardSql = `SELECT row_number() OVER (ORDER BY sum(s.points) DESC,max(s.created_at) ASC,u.id)::int AS rank,
  u.id AS "userId",u.username,sum(s.points)::int AS points,count(*)::int AS "solveCount",max(s.created_at) AS "lastSolveAt"
  FROM solves s JOIN users u ON u.id=s.user_id WHERE s.context_key=$1 AND NOT s.invalidated
  GROUP BY u.id,u.username`;
export async function practiceStats(db: EntityManager, userId: string) {
  const [row] = await db.query(
    `SELECT * FROM (${leaderboardSql}) board WHERE "userId"=$2`,
    ["practice", userId],
  );
  return row ?? { points: 0, solveCount: 0, rank: 0 };
}
