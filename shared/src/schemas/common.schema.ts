import { z } from "zod";
export const uuidParamSchema = z.object({ id: z.uuid() });
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const contextSchema = z.object({ eventId: z.uuid().optional() });
export const reasonSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
