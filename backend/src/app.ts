import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import type { DataSource } from "typeorm";
import type { Config } from "./config/env.js";
import { authRoutes } from "./auth/routes.js";
import {
  authenticate,
  requirePasswordChanged,
  roles,
} from "./auth/sessions.js";
import { HttpError, errorHandler } from "./http/errors.js";
import { challengeRoutes } from "./challenges/routes.js";
import { resourceRoutes } from "./challenges/resources.js";
import { eventRoutes } from "./events/routes.js";
import { submissionRoutes } from "./submissions/routes.js";
import { reviewRoutes } from "./reviews/routes.js";
import { userRoutes } from "./admin/users.js";
import { moderationRoutes } from "./admin/moderation.js";
import { dashboardRoutes } from "./dashboard/routes.js";
import { leaderboardRoutes } from "./leaderboard/routes.js";
import { publicRoutes } from "./public/routes.js";

export function createApp(db: DataSource, config: Config) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", Number(config.TRUST_PROXY));
  app.use(
    helmet(),
    cors({ origin: config.APP_URL, credentials: true }),
    cookieParser(),
  );
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 300,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        code: "RATE_LIMITED",
        message: "Too many requests. Try again later.",
      },
    }),
  );
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin &&
      req.headers.origin !== config.APP_URL
    ) {
      throw new HttpError(
        403,
        "ORIGIN_REJECTED",
        "Request origin is not allowed",
      );
    }
    next();
  });
  app.use(express.json({ limit: "256kb" }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/ready", async (_req, res) => {
    try {
      await db.query("SELECT 1");
      res.json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "database_unavailable" });
    }
  });
  app.use("/api/auth", authRoutes(db, config));
  app.use("/api/public", publicRoutes(db));
  app.use("/api", authenticate(db, config), requirePasswordChanged);
  app.use("/api/challenges", challengeRoutes(db), submissionRoutes(db));
  app.use("/api/events", eventRoutes(db));
  app.use("/api/leaderboard", leaderboardRoutes(db));
  app.use("/api/dashboard", dashboardRoutes(db));
  app.use("/api", resourceRoutes(db, config), reviewRoutes(db));
  app.use("/api/admin", roles("admin"));
  app.use("/api/admin/users", userRoutes(db));
  app.use("/api/admin", moderationRoutes(db));
  app.use((_req, _res) => {
    throw new HttpError(404, "NOT_FOUND", "Endpoint not found");
  });
  app.use(errorHandler);
  return app;
}
