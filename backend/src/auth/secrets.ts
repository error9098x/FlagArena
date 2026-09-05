import { createHash, randomBytes, randomInt } from "node:crypto";
import bcrypt from "bcrypt";
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const randomToken = () => randomBytes(32).toString("hex");
export const verificationCode = () =>
  String(randomInt(0, 1000000)).padStart(6, "0");
// Prehash variable-length flags and codes so bcrypt never truncates their suffix.
export const hashSecret = (value: string) => bcrypt.hash(digest(value), 12);
export const compareSecret = (value: string, hash: string) =>
  bcrypt.compare(digest(value), hash);
