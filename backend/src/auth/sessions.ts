import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import type { RequestHandler, Response } from "express";
import type { DataSource, EntityManager } from "typeorm";
import type { Config } from "../config/env.js";
import { UserEntity, type User } from "../database/entities.js";
import { digest, randomToken } from "./secrets.js";
import { HttpError, requireCondition } from "../http/errors.js";
import type { UserDto, UserRole } from "@flagarena/shared";

const issuer = "flagarena";
const audience = "flagarena-api";
export function publicUser(user: User): UserDto {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isSuspended: user.isSuspended,
    isVerified: user.isVerified,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt.toISOString(),
  };
}
export async function issueSession(
  db: EntityManager,
  config: Config,
  user: User,
  familyId = randomUUID(),
) {
  const token = randomToken();
  const id = randomUUID();
  await db.query(
    `INSERT INTO refresh_sessions(id,user_id,token_hash,family_id,expires_at)
    VALUES($1,$2,$3,$4,now()+interval '7 days')`,
    [id, user.id, digest(token), familyId],
  );
  const accessToken = jwt.sign(
    { sid: id, version: user.tokenVersion },
    config.JWT_SECRET,
    {
      algorithm: "HS256",
      subject: user.id,
      issuer,
      audience,
      expiresIn: "15m",
    },
  );
  return { token, payload: { user: publicUser(user), accessToken } };
}
export function setRefreshCookie(res: Response, config: Config, token: string) {
  res.cookie("flagarena_refresh", token, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 7 * 86400000,
  });
}
export function clearRefreshCookie(res: Response, config: Config) {
  res.clearCookie("flagarena_refresh", {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
  });
}
export function authenticate(db: DataSource, config: Config): RequestHandler {
  return async (req, _res, next) => {
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : "";
    let claims: jwt.JwtPayload;
    try {
      const value = jwt.verify(token, config.JWT_SECRET, {
        algorithms: ["HS256"],
        issuer,
        audience,
      });
      if (
        typeof value === "string" ||
        !value.sub ||
        typeof value.sid !== "string" ||
        typeof value.version !== "number"
      )
        throw new Error("Invalid claims");
      claims = value;
    } catch {
      throw new HttpError(401, "UNAUTHENTICATED", "Log in to use this action");
    }
    const user = await db
      .getRepository(UserEntity)
      .findOneBy({ id: claims.sub! });
    const session = await db.query(
      "SELECT id FROM refresh_sessions WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL AND expires_at>now()",
      [claims.sid, claims.sub],
    );
    requireCondition(
      user &&
        user.isVerified &&
        !user.isSuspended &&
        user.tokenVersion === claims.version &&
        session.length,
      401,
      "SESSION_EXPIRED",
      "Log in again",
    );
    req.user = user;
    next();
  };
}
export const requirePasswordChanged: RequestHandler = (req, _res, next) => {
  requireCondition(
    !req.user?.mustChangePassword,
    403,
    "PASSWORD_CHANGE_REQUIRED",
    "Replace your temporary password",
  );
  next();
};
export function roles(...allowed: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    requireCondition(
      req.user && allowed.includes(req.user.role),
      403,
      "FORBIDDEN",
      "Access denied",
    );
    next();
  };
}
