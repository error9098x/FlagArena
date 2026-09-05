import { randomUUID } from "node:crypto";
import { mkdir, rename, unlink, copyFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { Router } from "express";
import multer from "multer";
import type { DataSource } from "typeorm";
import { z } from "zod";
import { UPLOAD_LIMIT_BYTES, contextSchema } from "@flagarena/shared";
import type { Config } from "../config/env.js";
import { currentUser, routeId } from "../http/request.js";
import { requireCondition } from "../http/errors.js";
import { roles } from "../auth/sessions.js";
import { canEditChallenge, lockUser, visibleChallenge } from "./access.js";
import { ChallengeEntity } from "../database/entities.js";

export function safeFilename(value: string) {
  return (
    basename(value.replaceAll("\\", "/"))
      .replace(/[\x00-\x1f\x7f"<>:]/g, "_")
      .slice(0, 160) || "download"
  );
}
export function resourceRoutes(db: DataSource, config: Config) {
  const router = Router();
  const upload = multer({
    dest: tmpdir(),
    limits: {
      fileSize: UPLOAD_LIMIT_BYTES,
      files: 1,
      fields: 1,
      fieldSize: 500,
    },
  });
  router.post(
    "/challenges/:id/resources",
    roles("admin", "author"),
    upload.single("file"),
    async (req, res) => {
      requireCondition(req.file, 400, "FILE_REQUIRED", "Select a file");
      const file = req.file;
      let temporaryPath: string | null = file.path;
      let storedPath: string | null = null;
      try {
        const id = routeId(req);
        const resourceId = randomUUID();
        const filename = safeFilename(file.originalname);
        const label = z
          .string()
          .trim()
          .min(1)
          .max(160)
          .parse(req.body.label || filename);
        await mkdir(config.UPLOAD_DIR, { recursive: true, mode: 0o700 });
        await db.transaction(async (manager) => {
          const user = await lockUser(manager, currentUser(req).id);
          const challenge = await manager
            .getRepository(ChallengeEntity)
            .findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
          requireCondition(
            challenge && canEditChallenge(user, challenge),
            403,
            "RESOURCE_LOCKED",
            "Released resources cannot be changed",
          );
          storedPath = join(config.UPLOAD_DIR, resourceId);
          try {
            await rename(file.path, storedPath);
          } catch (error) {
            if (!(
              error &&
              typeof error === "object" &&
              "code" in error &&
              error.code === "EXDEV"
            ))
              throw error;
            await copyFile(file.path, storedPath, constants.COPYFILE_EXCL);
            await unlink(file.path);
          }
          temporaryPath = null;
          await manager.query(
            "INSERT INTO resources(id,challenge_id,label,filename,storage_name,size) VALUES($1,$2,$3,$4,$5,$6)",
            [resourceId, id, label, filename, resourceId, file.size],
          );
        });
        storedPath = null;
        res.status(201).json({
          id: resourceId,
          label,
          filename,
          size: file.size,
          url: null,
        });
      } finally {
        if (temporaryPath) await unlink(temporaryPath).catch(() => undefined);
        if (storedPath) await unlink(storedPath).catch(() => undefined);
      }
    },
  );
  router.get("/resources/:id/download", async (req, res, next) => {
    const [resource] = await db.query("SELECT * FROM resources WHERE id=$1", [
      routeId(req),
    ]);
    requireCondition(
      resource?.storage_name,
      404,
      "NOT_FOUND",
      "File not found",
    );
    await visibleChallenge(
      db.manager,
      currentUser(req),
      resource.challenge_id,
      contextSchema.parse(req.query).eventId,
    );
    const storageName = z.uuid().parse(resource.storage_name);
    res.set({
      "Content-Type": "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    });
    res.download(
      join(config.UPLOAD_DIR, storageName),
      safeFilename(resource.filename),
      (error) => {
        if (error) next(error);
      },
    );
  });
  router.delete(
    "/resources/:id",
    roles("admin", "author"),
    async (req, res) => {
      const id = routeId(req);
      let storageName: string | null = null;
      await db.transaction(async (manager) => {
        const user = await lockUser(manager, currentUser(req).id);
        const [resource] = await manager.query(
          "SELECT * FROM resources WHERE id=$1",
          [id],
        );
        requireCondition(resource, 404, "NOT_FOUND", "File not found");
        const challenge = await manager.getRepository(ChallengeEntity).findOne({
          where: { id: resource.challenge_id },
          lock: { mode: "pessimistic_write" },
        });
        requireCondition(
          challenge && canEditChallenge(user, challenge),
          403,
          "RESOURCE_LOCKED",
          "Released resources cannot be changed",
        );
        await manager.query("DELETE FROM resources WHERE id=$1", [id]);
        storageName = resource.storage_name;
      });
      if (storageName)
        await unlink(
          join(config.UPLOAD_DIR, z.uuid().parse(storageName)),
        ).catch(() => console.error("Orphaned resource requires cleanup"));
      res.status(204).end();
    },
  );
  return router;
}
