import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import type { Router } from "express";
import type { DataSource } from "typeorm";
import {
  registerSchema,
  verifySchema,
  emailRequestSchema,
} from "@flagarena/shared";
import type { Config } from "../config/env.js";
import { UserEntity } from "../database/entities.js";
import { requireCondition, HttpError } from "../http/errors.js";
import { compareSecret, hashSecret, verificationCode } from "./secrets.js";
import { consumeLimit } from "./rate-limit.js";
import { sendEmail } from "./email.js";
import { verificationEmail } from "./emailTemplates.js";

async function deliverCode(
  db: DataSource,
  config: Config,
  userId: string,
  email: string,
) {
  const code = verificationCode();
  const codeHash = await hashSecret(code);
  await db.transaction(async (manager) => {
    await manager.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
      userId,
    ]);
    await manager.query(
      `INSERT INTO verification_codes(user_id,code_hash,expires_at) VALUES($1,$2,now()+interval '10 minutes')
      ON CONFLICT(user_id) DO UPDATE SET code_hash=$2,expires_at=now()+interval '10 minutes',attempts=0`,
      [userId, codeHash],
    );
  });
  await sendEmail(
    config,
    email,
    "Verify your email",
    `Your FlagArena verification code is ${code}. It expires in 10 minutes.`,
    verificationEmail(code),
  );
}

export function registrationRoutes(
  router: Router,
  db: DataSource,
  config: Config,
) {
  router.post("/register", async (req, res) => {
    const input = registerSchema.parse(req.body);
    await consumeLimit(db.manager, `register:ip:${req.ip}`, 10, 3600);
    await consumeLimit(db.manager, `register:email:${input.email}`, 3, 3600);
    const id = randomUUID();
    await db.getRepository(UserEntity).insert({
      id,
      username: input.username,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 12),
      role: "player",
    });
    await deliverCode(db, config, id, input.email);
    res
      .status(201)
      .json({ message: "Verification code sent", email: input.email });
  });
  router.post("/resend", async (req, res) => {
    const { email } = emailRequestSchema.parse(req.body);
    await consumeLimit(db.manager, `resend:ip:${req.ip}`, 20, 3600);
    await consumeLimit(db.manager, `resend:email:${email}`, 1, 60);
    const user = await db
      .getRepository(UserEntity)
      .findOneBy({ email, isVerified: false, isSuspended: false });
    if (user) await deliverCode(db, config, user.id, email);
    res.json({ message: "Verification email requested" });
  });
  router.post("/verify", async (req, res) => {
    const { email, code } = verifySchema.parse(req.body);
    await consumeLimit(db.manager, `verify:${req.ip}`, 30, 600);
    const outcome = await db.transaction(async (manager) => {
      const user = await manager
        .getRepository(UserEntity)
        .findOne({ where: { email }, lock: { mode: "pessimistic_write" } });
      if (!user || user.isSuspended || user.isVerified) return "invalid";
      const [record] = await manager.query(
        "SELECT * FROM verification_codes WHERE user_id=$1",
        [user.id],
      );
      if (!record || record.expires_at <= new Date() || record.attempts >= 5)
        return "expired";
      if (!(await compareSecret(code, record.code_hash))) {
        await manager.query(
          "UPDATE verification_codes SET attempts=attempts+1 WHERE user_id=$1",
          [user.id],
        );
        return "invalid";
      }
      await manager
        .getRepository(UserEntity)
        .update(user.id, { isVerified: true });
      await manager.query("DELETE FROM verification_codes WHERE user_id=$1", [
        user.id,
      ]);
      return "verified";
    });
    if (outcome === "expired")
      throw new HttpError(
        400,
        "CODE_EXPIRED",
        "Code expired. Request a new code.",
      );
    requireCondition(
      outcome === "verified",
      400,
      "INCORRECT_CODE",
      "Incorrect code",
    );
    res.json({ message: "Email verified" });
  });
}
