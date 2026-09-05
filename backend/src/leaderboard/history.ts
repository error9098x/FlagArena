import type { EntityManager } from "typeorm";
import type { ScoreHistoryDto, LeaderboardRowDto } from "@flagarena/shared";
import { leaderboardSql } from "./queries.js";

export async function scoreHistory(
  db: EntityManager,
  context: string,
  viewerId: string,
  selected?: string[],
  startsAt?: Date,
  endsAt?: Date,
): Promise<ScoreHistoryDto> {
  const board: LeaderboardRowDto[] = await db.query(
    `${leaderboardSql} ORDER BY rank LIMIT 5`,
    [context],
  );
  const [mine] = await db.query(
    `SELECT * FROM (${leaderboardSql}) board WHERE "userId"=$2`,
    [context, viewerId],
  );
  const ids = selected ?? [
    ...new Set([
      ...board.map((row) => row.userId),
      ...(mine ? [viewerId] : []),
    ]),
  ];
  const players: LeaderboardRowDto[] = ids.length
    ? await db.query(
        `SELECT * FROM (${leaderboardSql}) board WHERE "userId"=ANY($2::uuid[]) ORDER BY rank`,
        [context, ids],
      )
    : [];
  const solves: { userId: string; points: number; createdAt: Date }[] =
    players.length
      ? await db.query(
          `SELECT user_id AS "userId",points,created_at AS "createdAt" FROM solves
    WHERE context_key=$1 AND user_id=ANY($2::uuid[]) AND NOT invalidated ORDER BY created_at,id`,
          [context, players.map((player) => player.userId)],
        )
      : [];
  const now = new Date();
  const finish = endsAt && endsAt < now ? endsAt : now;
  const start = startsAt ?? solves[0]?.createdAt ?? finish;
  const totals: Record<string, number> = Object.fromEntries(
    players.map((player) => [player.userId, 0]),
  );
  const points = [
    {
      time: Math.min(start.getTime(), finish.getTime()),
      scores: { ...totals },
    },
  ];
  for (const solve of solves) {
    totals[solve.userId] = (totals[solve.userId] ?? 0) + solve.points;
    const time = solve.createdAt.getTime();
    if (points.length > 1 && points.at(-1)!.time === time)
      points[points.length - 1] = { time, scores: { ...totals } };
    else points.push({ time, scores: { ...totals } });
  }
  points.push({
    time: Math.max(finish.getTime(), points.at(-1)!.time),
    scores: { ...totals },
  });
  return {
    players,
    points,
    me: mine ?? null,
    live: !!endsAt && endsAt > now && (!startsAt || startsAt <= now),
  };
}
