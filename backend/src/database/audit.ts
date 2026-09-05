import { randomUUID } from "node:crypto";
import type { EntityManager } from "typeorm";
export async function audit(
  db: EntityManager,
  actorId: string | null,
  action: string,
  targetId: string,
  reason?: string,
) {
  await db.query(
    "INSERT INTO audit_log(id,actor_id,action,target_id,reason) VALUES($1,$2,$3,$4,$5)",
    [randomUUID(), actorId, action, targetId, reason ?? null],
  );
}
