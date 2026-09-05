import { Router } from "express";
import bcrypt from "bcrypt";
import type { DataSource } from "typeorm";
import { loginSchema, usernameSchema } from "@flagarena/shared";
import { z } from "zod";
import type { Config } from "../config/env.js";
import { UserEntity } from "../database/entities.js";
import { HttpError, requireCondition } from "../http/errors.js";
import { currentUser } from "../http/request.js";
import {
  authenticate,
  clearRefreshCookie,
  issueSession,
  publicUser,
  setRefreshCookie,
} from "./sessions.js";
import { digest } from "./secrets.js";
import { consumeLimit } from "./rate-limit.js";
import { registrationRoutes } from "./registration.js";
import { passwordRoutes } from "./passwords.js";

const dummyHash =
  "$2b$12$SSc.XKWmcqIkw80.MHIuheGaPrLfOLUQD0KyIXxeSMTmzLCw2sItS";
export function authRoutes(db: DataSource, config: Config) {
  const router = Router();
  registrationRoutes(router, db, config);
  passwordRoutes(router, db, config);
  router.post(["/login", "/admin/login"], async (req, res) => {
    const input = loginSchema.parse(req.body);
    await consumeLimit(db.manager, `login:ip:${req.ip}`, 50, 900);
    await consumeLimit(db.manager, `login:email:${input.email}`, 15, 900);
    const session = await db.transaction(async (manager) => {
      // Password changes and session creation serialize on the same account.
      const user = await manager
        .getRepository(UserEntity)
        .createQueryBuilder("user")
        .addSelect("user.passwordHash")
        .where("user.email=:email", { email: input.email })
        .setLock("pessimistic_write")
        .getOne();
      const matches = await bcrypt.compare(
        input.password,
        user?.passwordHash ?? dummyHash,
      );
      requireCondition(
        user &&
          matches &&
          (req.path !== "/admin/login" || user.role === "admin"),
        401,
        "INVALID_CREDENTIALS",
        "Incorrect email or password",
      );
      requireCondition(
        !user.isSuspended,
        403,
        "SUSPENDED",
        "Account suspended",
      );
      requireCondition(
        user.isVerified,
        403,
        "EMAIL_UNVERIFIED",
        "Verify your email",
      );
      return issueSession(manager, config, user);
    });
    setRefreshCookie(res, config, session.token);
    res.json(session.payload);
  });
  router.post("/refresh", async (req, res) => {
    await consumeLimit(db.manager, `refresh:${req.ip}`, 100, 900);
    const token = req.cookies?.flagarena_refresh;
    requireCondition(
      typeof token === "string" && /^[a-f0-9]{64}$/.test(token),
      401,
      "SESSION_EXPIRED",
      "Log in again",
    );
    const session = await db.transaction(async (manager) => {
      const [owner] = await manager.query(
        "SELECT user_id FROM refresh_sessions WHERE token_hash=$1",
        [digest(token)],
      );
      if (!owner) return null;
      await manager.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
        owner.user_id,
      ]);
      const [old] = await manager.query(
        "SELECT * FROM refresh_sessions WHERE token_hash=$1 FOR UPDATE",
        [digest(token)],
      );
      if (!old) return null;
      if (old.revoked_at) {
        await manager.query(
          "UPDATE refresh_sessions SET revoked_at=now() WHERE family_id=$1",
          [old.family_id],
        );
        return null;
      }
      if (old.expires_at <= new Date()) return null;
      const user = await manager
        .getRepository(UserEntity)
        .findOneBy({ id: old.user_id });
      if (!user || !user.isVerified || user.isSuspended) return null;
      await manager.query(
        "UPDATE refresh_sessions SET revoked_at=now() WHERE id=$1",
        [old.id],
      );
      return issueSession(manager, config, user, old.family_id);
    });
    if (!session) {
      clearRefreshCookie(res, config);
      throw new HttpError(401, "SESSION_EXPIRED", "Log in again");
    }
    setRefreshCookie(res, config, session.token);
    res.json(session.payload);
  });
  router.post("/logout", async (req, res) => {
    const token = req.cookies?.flagarena_refresh;
    if (typeof token === "string")
      await db.transaction(async (manager) => {
        const [session] = await manager.query(
          "SELECT user_id,family_id FROM refresh_sessions WHERE token_hash=$1",
          [digest(token)],
        );
        if (!session) return;
        await manager.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
          session.user_id,
        ]);
        await manager.query(
          "UPDATE refresh_sessions SET revoked_at=now() WHERE family_id=$1",
          [session.family_id],
        );
      });
    clearRefreshCookie(res, config);
    res.status(204).end();
  });
  router.get("/me", authenticate(db, config), (req, res) =>
    res.json(publicUser(currentUser(req))),
  );
  router.patch("/me", authenticate(db, config), async (req, res) => {
    const { username } = z.object({ username: usernameSchema }).parse(req.body);
    const user = currentUser(req);
    await db.getRepository(UserEntity).update(user.id, { username });
    res.json(publicUser({ ...user, username }));
  });
  return router;
}
