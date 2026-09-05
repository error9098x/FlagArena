import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { Router } from "express";
import type { DataSource } from "typeorm";
import {
  createUserSchema,
  paginationSchema,
  updateUserSchema,
} from "@flagarena/shared";
import { UserEntity } from "../database/entities.js";
import { currentUser, routeId } from "../http/request.js";
import { requireCondition } from "../http/errors.js";
import { publicUser } from "../auth/sessions.js";
import { audit } from "../database/audit.js";
import { randomToken } from "../auth/secrets.js";
import { lockUser } from "../challenges/access.js";

export function userRoutes(db: DataSource) {
  const router = Router();
  router.get("/", async (req, res) => {
    const { page, limit } = paginationSchema.parse(req.query);
    const [users, total] = await db.getRepository(UserEntity).findAndCount({
      order: { createdAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });
    res.json({ items: users.map(publicUser), total, page, limit });
  });
  router.post("/", async (req, res) => {
    const input = createUserSchema.parse(req.body);
    const temporaryPassword = randomToken().slice(0, 24);
    const id = randomUUID();
    await db.transaction(async (manager) => {
      const actor = await lockUser(manager, currentUser(req).id);
      requireCondition(
        actor.role === "admin",
        403,
        "FORBIDDEN",
        "Access denied",
      );
      requireCondition(
        !(await manager
          .getRepository(UserEntity)
          .existsBy({ email: input.email })),
        409,
        "EMAIL_EXISTS",
        "An account with this email already exists",
      );
      await manager.getRepository(UserEntity).insert({
        id,
        ...input,
        passwordHash: await bcrypt.hash(temporaryPassword, 12),
        isVerified: true,
        mustChangePassword: true,
      });
      await audit(manager, actor.id, "user.created", id, input.role);
    });
    res
      .status(201)
      .set("Cache-Control", "no-store")
      .json({ id, temporaryPassword });
  });
  router.patch("/:id", async (req, res) => {
    const input = updateUserSchema.parse(req.body);
    const id = routeId(req);
    await db.transaction(async (manager) => {
      // Serializes administrator changes so concurrent demotions cannot remove the last Admin.
      await manager.query("SELECT pg_advisory_xact_lock(83142)");
      const ids = [...new Set([id, currentUser(req).id])].sort();
      await manager.query(
        "SELECT id FROM users WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE",
        [ids],
      );
      const actor = await manager
        .getRepository(UserEntity)
        .findOneBy({ id: currentUser(req).id });
      requireCondition(
        actor?.role === "admin" &&
          !actor.isSuspended &&
          !actor.mustChangePassword,
        403,
        "FORBIDDEN",
        "Access denied",
      );
      const user = await manager.getRepository(UserEntity).findOneBy({ id });
      requireCondition(user, 404, "NOT_FOUND", "User not found");
      if (
        user.role === "admin" &&
        !user.isSuspended &&
        (input.role !== "admin" || input.isSuspended)
      ) {
        const count = await manager
          .getRepository(UserEntity)
          .countBy({ role: "admin", isSuspended: false });
        requireCondition(
          count > 1,
          409,
          "LAST_ADMIN",
          "Keep at least one active Admin",
        );
      }
      if (input.role !== user.role) {
        const active = await manager.query(
          `SELECT 1 FROM registrations r JOIN events e ON e.id=r.event_id WHERE r.user_id=$1 AND e.status='scheduled' AND e.ends_at>now()`,
          [id],
        );
        requireCondition(
          !active.length,
          409,
          "ACTIVE_PARTICIPANT",
          "Change the role after registered events end",
        );
      }
      await manager.getRepository(UserEntity).update(id, {
        role: input.role,
        isSuspended: input.isSuspended,
        tokenVersion: user.tokenVersion + 1,
      });
      await manager.query(
        "UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1",
        [id],
      );
      await audit(
        manager,
        actor.id,
        "user.updated",
        id,
        `${input.reason}; role=${input.role}; suspended=${input.isSuspended}`,
      );
    });
    res.json({ message: "User updated" });
  });
  return router;
}
