import { z } from "zod";
import { flagSchema } from "./challenge.schema.js";
export const submitFlagSchema = z.object({
  flag: flagSchema,
  eventId: z.uuid().optional(),
});
export const correctScoreSchema = z.object({
  points: z.coerce.number().int().min(0).max(10000),
  invalidated: z.boolean(),
  reason: z.string().trim().min(3).max(500),
});
