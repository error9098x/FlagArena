import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
  }
}
export function requireCondition(
  condition: unknown,
  status: number,
  code: string,
  message: string,
): asserts condition {
  if (!condition) throw new HttpError(status, code, message);
}
export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  if (error instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues)
      (details[issue.path.join(".") || "form"] ??= []).push(issue.message);
    res.status(400).json({
      code: "VALIDATION",
      message: "Check the submitted values",
      details,
    });
  } else if (error instanceof HttpError) {
    if (error.retryAfter) res.set("Retry-After", String(error.retryAfter));
    res.status(error.status).json({
      code: error.code,
      message: error.message,
      retryAfter: error.retryAfter,
    });
  } else if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23505"
  ) {
    res
      .status(409)
      .json({ code: "CONFLICT", message: "This record already exists" });
  } else if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "LIMIT_FILE_SIZE"
  ) {
    res.status(413).json({
      code: "FILE_TOO_LARGE",
      message: "Files must be 100 MB or smaller",
    });
  } else if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "MulterError"
  ) {
    res.status(400).json({
      code: "UPLOAD_REJECTED",
      message: "Upload one file per request",
    });
  } else if (
    error &&
    typeof error === "object" &&
    "type" in error &&
    error.type === "entity.too.large"
  ) {
    res
      .status(413)
      .json({ code: "BODY_TOO_LARGE", message: "Request is too large" });
  } else if (error instanceof SyntaxError && "body" in error) {
    res
      .status(400)
      .json({ code: "INVALID_JSON", message: "Invalid JSON request" });
  } else {
    console.error(
      "Request failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "Request failed. Retry the action.",
    });
  }
};
