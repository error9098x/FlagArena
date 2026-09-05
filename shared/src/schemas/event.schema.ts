import { z } from "zod";
import { paginationSchema } from "./common.schema.js";
export const createEventSchema = z
  .object({
    title: z.string().trim().min(4).max(120),
    description: z.string().trim().min(10).max(5000),
    rules: z.string().max(5000).default(""),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    status: z.enum(["draft", "scheduled", "archived"]),
    access: z.enum(["open", "invite_only"]),
    joinCode: z.string().trim().min(4).max(72).optional(),
    dynamicScoring: z.boolean().default(false),
    challengeIds: z.array(z.uuid()).max(200).default([]),
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    path: ["endsAt"],
    message: "End must be after start",
  });
export const joinEventSchema = z.object({
  code: z.string().trim().max(72).optional(),
});
export const rotateCodeSchema = z.object({
  code: z.string().trim().min(4).max(72),
  reason: z.string().trim().min(3).max(500),
});
export const eventQuerySchema = paginationSchema.extend({
  scope: z.enum(["all", "upcoming", "live", "past"]).default("all"),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;
