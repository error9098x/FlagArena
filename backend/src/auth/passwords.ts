import bcrypt from "bcrypt";
import type { Router } from "express";
import type { DataSource } from "typeorm";
import {
  changePasswordSchema,
  emailRequestSchema,
  resetPasswordSchema,
} from "@flagarena/shared";
import type { Config } from "../config/env.js";
import { UserEntity } from "../database/entities.js";
import { authenticate, clearRefreshCookie } from "./sessions.js";
import { randomToken, digest } from "./secrets.js";
import { consumeLimit } from "./rate-limit.js";
import { sendEmail } from "./email.js";
import { currentUser } from "../http/request.js";
import { requireCondition } from "../http/errors.js";

export function passwordRoutes(router: Router, db: DataSource, config: Config) {
  router.post("/forgot-password", async (req, res) => {
    const { email } = emailRequestSchema.parse(req.body);
    await consumeLimit(db.manager, `recovery:ip:${req.ip}`, 10, 900);
    await consumeLimit(db.manager, `recovery:email:${email}`, 3, 900);
    const user = await db
      .getRepository(UserEntity)
      .findOneBy({ email, isVerified: true, isSuspended: false });
    if (user) {
      const token = randomToken();
      await db.transaction(async (manager) => {
        await manager.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
          user.id,
        ]);
        await manager.query(
          `INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '15 minutes')
          ON CONFLICT(user_id) DO UPDATE SET token_hash=$2,expires_at=now()+interval '15 minutes'`,
          [user.id, digest(token)],
        );
      });
      // The public response stays identical if the provider rejects an eligible account's email.
      try {
        await sendEmail(
          config,
          email,
          "Reset your password",
          `${config.APP_URL}/reset-password#${token}\nThis link expires in 15 minutes.`,
        );
      } catch {
        console.error("Password recovery email unavailable");
      }
    }
    res.json({ message: "Password reset email requested" });
  });
  router.post("/reset-password", async (req, res) => {
    const { token, password } = resetPasswordSchema.parse(req.body);
    await consumeLimit(db.manager, `reset:${req.ip}`, 20, 900);
    const hash = await bcrypt.hash(password, 12);
    await db.transaction(async (manager) => {
      const [record] = await manager.query(
        "SELECT user_id FROM password_resets WHERE token_hash=$1",
        [digest(token)],
      );
      requireCondition(
        record,
        400,
        "RESET_EXPIRED",
        "Reset link expired. Request another link.",
      );
      await manager.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
        record.user_id,
      ]);
      const [valid] = await manager.query(
        "DELETE FROM password_resets WHERE user_id=$1 AND token_hash=$2 AND expires_at>now() RETURNING user_id",
        [record.user_id, digest(token)],
      );
      requireCondition(
        valid,
        400,
        "RESET_EXPIRED",
        "Reset link expired. Request another link.",
      );
      await manager.query(
        "UPDATE users SET password_hash=$2,must_change_password=false,token_version=token_version+1 WHERE id=$1 AND NOT is_suspended",
        [record.user_id, hash],
      );
      await manager.query(
        "UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1",
        [record.user_id],
      );
    });
    clearRefreshCookie(res, config);
    res.json({ message: "Password changed" });
  });
  router.post(
    "/change-password",
    authenticate(db, config),
    async (req, res) => {
      const input = changePasswordSchema.parse(req.body);
      const userId = currentUser(req).id;
      await consumeLimit(db.manager, `password:${userId}`, 10, 900);
      await db.transaction(async (manager) => {
        const [user] = await manager.query(
          "SELECT password_hash FROM users WHERE id=$1 FOR UPDATE",
          [userId],
        );
        requireCondition(
          await bcrypt.compare(input.currentPassword, user.password_hash),
          400,
          "PASSWORD_INCORRECT",
          "Incorrect current password",
        );
        await manager.query(
          "UPDATE users SET password_hash=$2,must_change_password=false,token_version=token_version+1 WHERE id=$1",
          [userId, await bcrypt.hash(input.newPassword, 12)],
        );
        await manager.query(
          "UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1",
          [userId],
        );
        await manager.query("DELETE FROM password_resets WHERE user_id=$1", [
          userId,
        ]);
      });
      clearRefreshCookie(res, config);
      res.json({ message: "Password changed. Log in again." });
    },
  );
}
