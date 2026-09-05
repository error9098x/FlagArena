import type { EntityManager } from "typeorm";
import { digest } from "./secrets.js";
import { HttpError } from "../http/errors.js";

export async function consumeLimit(
  db: EntityManager,
  key: string,
  maximum: number,
  seconds: number,
) {
  const [row] = (await db.query(
    `INSERT INTO request_limits(key,count,expires_at) VALUES($1,1,now()+$2*interval '1 second')
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN request_limits.expires_at <= now() THEN 1 ELSE request_limits.count+1 END,
      expires_at = CASE WHEN request_limits.expires_at <= now() THEN now()+$2*interval '1 second' ELSE request_limits.expires_at END
    RETURNING count, GREATEST(1,ceil(extract(epoch FROM expires_at-now())))::int AS retry`,
    [digest(key), seconds],
  )) as { count: number; retry: number }[];
  if (row && row.count > maximum)
    throw new HttpError(
      429,
      "RATE_LIMITED",
      "Too many attempts. Try again later.",
      row.retry,
    );
}
