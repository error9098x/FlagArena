import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { DataSource, EntityManager } from "typeorm";
import {
  challengeQuerySchema,
  contextSchema,
  createChallengeSchema,
  moderateChallengeSchema,
  textCorrectionSchema,
  updateChallengeSchema,
  type CreateChallengeInput,
} from "@flagarena/shared";
import { ChallengeEntity } from "../database/entities.js";
import { currentUser, routeId } from "../http/request.js";
import { requireCondition } from "../http/errors.js";
import { roles } from "../auth/sessions.js";
import { hashSecret } from "../auth/secrets.js";
import { audit } from "../database/audit.js";
import { canEditChallenge, lockUser } from "./access.js";
import { challengeDetail, listChallenges } from "./queries.js";

async function saveHintsAndLinks(
  db: EntityManager,
  id: string,
  input: Pick<CreateChallengeInput, "hints" | "links">,
) {
  await db.query("DELETE FROM hints WHERE challenge_id=$1", [id]);
  await db.query(
    "DELETE FROM resources WHERE challenge_id=$1 AND url IS NOT NULL",
    [id],
  );
  for (const [position, hint] of input.hints.entries())
    await db.query(
      "INSERT INTO hints(id,challenge_id,position,content,cost) VALUES($1,$2,$3,$4,$5)",
      [randomUUID(), id, position, hint.content, hint.cost],
    );
  for (const link of input.links)
    await db.query(
      "INSERT INTO resources(id,challenge_id,label,url) VALUES($1,$2,$3,$4)",
      [randomUUID(), id, link.label, link.url],
    );
}
export function challengeRoutes(db: DataSource) {
  const router = Router();
  router.get("/authors", roles("admin", "author"), async (req, res) => {
    const user = currentUser(req);
    res.json(
      await db.query(
        `SELECT DISTINCT u.id,u.username FROM users u JOIN challenges c ON c.author_id=u.id
      WHERE $1 OR u.id=$2 ORDER BY u.username,u.id`,
        [user.role === "admin", user.id],
      ),
    );
  });
  router.get("/", async (req, res) =>
    res.json(
      await listChallenges(
        db.manager,
        currentUser(req),
        challengeQuerySchema.parse(req.query),
      ),
    ),
  );
  router.get("/:id", async (req, res) =>
    res.json(
      await challengeDetail(
        db.manager,
        currentUser(req),
        routeId(req),
        contextSchema.parse(req.query).eventId,
      ),
    ),
  );
  router.post("/", roles("admin", "author"), async (req, res) => {
    const input = createChallengeSchema.parse(req.body);
    const id = randomUUID();
    await db.transaction(async (manager) => {
      const user = await lockUser(manager, currentUser(req).id);
      requireCondition(
        user.role !== "player",
        403,
        "FORBIDDEN",
        "Access denied",
      );
      const { flag, hints: _hints, links: _links, ...fields } = input;
      await manager.getRepository(ChallengeEntity).insert({
        ...fields,
        id,
        authorId: user.id,
        flagHash: await hashSecret(flag),
        status: "draft",
      });
      await saveHintsAndLinks(manager, id, input);
    });
    res
      .status(201)
      .json(await challengeDetail(db.manager, currentUser(req), id));
  });
  router.put("/:id", roles("admin", "author"), async (req, res) => {
    const input = updateChallengeSchema.parse(req.body);
    const id = routeId(req);
    await db.transaction(async (manager) => {
      const user = await lockUser(manager, currentUser(req).id);
      const challenge = await manager
        .getRepository(ChallengeEntity)
        .findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      requireCondition(
        challenge && canEditChallenge(user, challenge),
        403,
        "EDIT_LOCKED",
        "Challenge content is locked",
      );
      const { flag, hints: _hints, links: _links, ...fields } = input;
      await manager.getRepository(ChallengeEntity).update(id, {
        ...fields,
        ...(flag ? { flagHash: await hashSecret(flag) } : {}),
      });
      await saveHintsAndLinks(manager, id, input);
    });
    res.json(await challengeDetail(db.manager, currentUser(req), id));
  });
  router.post(
    "/:id/submit-review",
    roles("admin", "author"),
    async (req, res) => {
      const id = routeId(req);
      await db.transaction(async (manager) => {
        const user = await lockUser(manager, currentUser(req).id);
        const challenge = await manager
          .getRepository(ChallengeEntity)
          .findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
        requireCondition(
          challenge && canEditChallenge(user, challenge),
          403,
          "EDIT_LOCKED",
          "Challenge content is locked",
        );
        await manager
          .getRepository(ChallengeEntity)
          .update(id, { status: "pending", rejectionReason: null });
        await audit(manager, user.id, "challenge.submitted", id);
      });
      res.json({ message: "Submitted for review" });
    },
  );
  router.post("/:id/moderate", roles("admin"), async (req, res) => {
    const input = moderateChallengeSchema.parse(req.body);
    const id = routeId(req);
    await db.transaction(async (manager) => {
      const user = await lockUser(manager, currentUser(req).id);
      requireCondition(
        user.role === "admin",
        403,
        "FORBIDDEN",
        "Access denied",
      );
      const challenge = await manager
        .getRepository(ChallengeEntity)
        .findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      requireCondition(
        challenge && challenge.status !== "archived",
        409,
        "INVALID_STATE",
        "Challenge cannot be moderated",
      );
      if (input.status === "approved")
        requireCondition(
          challenge.status === "pending" ||
            (challenge.status === "draft" && challenge.authorId === user.id) ||
            challenge.status === "disabled",
          409,
          "INVALID_STATE",
          "Submit the challenge for review first",
        );
      if (input.status === "rejected")
        requireCondition(
          challenge.status === "pending",
          409,
          "INVALID_STATE",
          "Only pending challenges can be rejected",
        );
      await manager.getRepository(ChallengeEntity).update(id, {
        status: input.status,
        rejectionReason: input.status === "rejected" ? input.reason : null,
        ...(input.status === "approved"
          ? {
              approvedBy: user.id,
              approvedAt: new Date(),
              releasedAt: challenge.releasedAt ?? new Date(),
            }
          : {}),
      });
      await audit(
        manager,
        user.id,
        `challenge.${input.status}`,
        id,
        input.reason,
      );
    });
    res.json({ message: "Challenge updated" });
  });
  router.patch("/:id/text", roles("admin"), async (req, res) => {
    const { reason, ...text } = textCorrectionSchema.parse(req.body);
    const id = routeId(req);
    await db.transaction(async (manager) => {
      const user = await lockUser(manager, currentUser(req).id);
      requireCondition(
        user.role === "admin",
        403,
        "FORBIDDEN",
        "Access denied",
      );
      const result = await manager
        .getRepository(ChallengeEntity)
        .update(id, text);
      requireCondition(
        result.affected,
        404,
        "NOT_FOUND",
        "Challenge not found",
      );
      await audit(manager, user.id, "challenge.text_corrected", id, reason);
    });
    res.json({ message: "Challenge saved" });
  });
  router.post("/:id/publish-practice", roles("admin"), async (req, res) => {
    const id = routeId(req);
    await db.transaction(async (manager) => {
      const user = await lockUser(manager, currentUser(req).id);
      requireCondition(
        user.role === "admin",
        403,
        "FORBIDDEN",
        "Access denied",
      );
      const challenge = await manager
        .getRepository(ChallengeEntity)
        .findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      requireCondition(
        challenge?.status === "approved",
        409,
        "INVALID_STATE",
        "Approve the challenge first",
      );
      const active = await manager.query(
        `SELECT e.id FROM events e JOIN event_challenges ec ON ec.event_id=e.id WHERE ec.challenge_id=$1 AND e.status='scheduled' AND e.ends_at>now()`,
        [id],
      );
      requireCondition(
        !active.length,
        409,
        "EVENT_PENDING",
        "Wait until selected events end",
      );
      await manager
        .getRepository(ChallengeEntity)
        .update(id, { visibility: "public_practice" });
      await audit(manager, user.id, "challenge.published_practice", id);
    });
    res.json({ message: "Published to practice" });
  });
  return router;
}
