import type { Request } from "express";
import type { User } from "../database/entities.js";
import { requireCondition } from "./errors.js";
import { uuidParamSchema } from "@flagarena/shared";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
export function currentUser(req: Request): User {
  requireCondition(
    req.user,
    401,
    "UNAUTHENTICATED",
    "Log in to use this action",
  );
  return req.user;
}
export function routeId(req: Request): string {
  return uuidParamSchema.parse(req.params).id;
}
export function pageResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
) {
  return { items, total, page, limit };
}
