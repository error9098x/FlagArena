import { z } from "zod";
import {
  CHALLENGE_CATEGORIES,
  CHALLENGE_DIFFICULTIES,
  CHALLENGE_STATUSES,
  VISIBILITIES,
} from "../constants/enums.js";
import { paginationSchema } from "./common.schema.js";
export const flagSchema = z.string().trim().min(1).max(256);
export const resourceLinkSchema = z.object({
  label: z.string().trim().min(1).max(160),
  url: z
    .url()
    .max(2048)
    .refine((v) => new URL(v).protocol === "https:", "Use an HTTPS URL"),
});
export const hintDraftSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  cost: z.coerce.number().int().min(0).max(1000),
});
export const createChallengeSchema = z.object({
  title: z.string().trim().min(4).max(120),
  description: z.string().trim().min(20).max(10000),
  category: z.enum(CHALLENGE_CATEGORIES),
  difficulty: z.enum(CHALLENGE_DIFFICULTIES),
  basePoints: z.coerce.number().int().min(50).max(1000),
  flag: flagSchema,
  visibility: z.enum(VISIBILITIES),
  connectionInfo: z.string().max(2000).default(""),
  hints: z.array(hintDraftSchema).max(5).default([]),
  links: z.array(resourceLinkSchema).default([]),
});
export const updateChallengeSchema = createChallengeSchema
  .omit({ flag: true })
  .extend({ flag: flagSchema.optional() });
export const textCorrectionSchema = z.object({
  title: z.string().trim().min(4).max(120),
  description: z.string().trim().min(20).max(10000),
  connectionInfo: z.string().max(2000),
  reason: z.string().trim().min(3).max(500),
});
export const moderateChallengeSchema = z
  .object({
    status: z.enum(["approved", "rejected", "disabled", "archived"]),
    reason: z.string().trim().max(500).default(""),
  })
  .refine((v) => v.status === "approved" || v.reason.length >= 3, {
    path: ["reason"],
    message: "Provide a reason",
  });
export const challengeQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  category: z.enum(CHALLENGE_CATEGORIES).optional(),
  difficulty: z.enum(CHALLENGE_DIFFICULTIES).optional(),
  status: z.enum(CHALLENGE_STATUSES).optional(),
  visibility: z.enum(VISIBILITIES).optional(),
  authorId: z.uuid().optional(),
  minPoints: z.coerce.number().int().min(0).optional(),
  maxPoints: z.coerce.number().int().min(0).optional(),
  minSolves: z.coerce.number().int().min(0).optional(),
  maxSolves: z.coerce.number().int().min(0).optional(),
  solved: z.enum(["true", "false"]).optional(),
  used: z.enum(["true", "false"]).optional(),
  eventId: z.uuid().optional(),
  view: z.enum(["practice", "manage"]).default("practice"),
  sortBy: z
    .enum(["createdAt", "points", "solveCount", "title"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>;
