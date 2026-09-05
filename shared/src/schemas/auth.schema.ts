import { z } from "zod";
import { AUTH_RULES } from "../constants/rules.js";
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email");
export const usernameSchema = z.string().trim().min(3).max(32);
export const passwordSchema = z
  .string()
  .min(AUTH_RULES.PASSWORD_MIN, "Use at least 8 characters")
  .refine(
    (value) =>
      new TextEncoder().encode(value).length <= AUTH_RULES.PASSWORD_MAX_BYTES,
    "Use at most 72 bytes",
  );
export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1)
    .refine(
      (value) =>
        new TextEncoder().encode(value).length <= AUTH_RULES.PASSWORD_MAX_BYTES,
      "Use at most 72 bytes",
    ),
});
export const verifySchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
export const emailRequestSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: passwordSchema,
});
export const changePasswordSchema = z
  .object({
    currentPassword: loginSchema.shape.password,
    newPassword: passwordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "Choose a different password",
    path: ["newPassword"],
  });
export const createUserSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  role: z.enum(["admin", "author", "player"]),
});
export const updateUserSchema = z.object({
  role: z.enum(["admin", "author", "player"]),
  isSuspended: z.boolean(),
  reason: z.string().trim().min(3).max(500),
});
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
