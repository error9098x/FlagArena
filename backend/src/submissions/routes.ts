import { Router } from "express";
import { z } from "zod";
import type { DataSource } from "typeorm";
import { contextSchema, submitFlagSchema } from "@flagarena/shared";
import { currentUser, routeId } from "../http/request.js";
import { requireCondition } from "../http/errors.js";
import {
  visibleChallenge,
  lockUser,
  requireCompetitor,
} from "../challenges/access.js";
import { requireEventAccess } from "../events/access.js";
import { submitFlag } from "./submit.js";
import { consumeLimit } from "../auth/rate-limit.js";

export function submissionRoutes(db: DataSource) {
  const router = Router();
  router.post("/:id/submissions", async (req, res) => {
    const { flag, eventId } = submitFlagSchema.parse(req.body);
    const user = currentUser(req);
    await consumeLimit(db.manager, `submission:${user.id}`, 60, 60);
    res.json(await submitFlag(db, user, routeId(req), flag, eventId));
  });
  router.post("/:id/hints/:hintId/unlock", async (req, res) => {
    const id = routeId(req);
    const hintId = z.uuid().parse(req.params.hintId);
    const { eventId } = contextSchema.parse(req.body);
    const result = await db.transaction(async (manager) => {
      const user = await lockUser(manager, currentUser(req).id);
      const challenge = await visibleChallenge(manager, user, id, eventId);
      requireCompetitor(user, challenge.authorId);
      if (eventId) await requireEventAccess(manager, user, eventId, true);
      requireCondition(
        challenge.status === "approved",
        403,
        "UNAVAILABLE",
        "Challenge unavailable",
      );
      await manager.query("SELECT id FROM challenges WHERE id=$1 FOR UPDATE", [
        id,
      ]);
      const [hint] = await manager.query(
        "SELECT id,position,content,cost FROM hints WHERE id=$1 AND challenge_id=$2",
        [hintId, id],
      );
      requireCondition(hint, 404, "NOT_FOUND", "Hint not found");
      await manager.query(
        "INSERT INTO hint_unlocks(user_id,hint_id,cost) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [user.id, hintId, hint.cost],
      );
      return { ...hint, unlocked: true };
    });
    res.json(result);
  });
  return router;
}
