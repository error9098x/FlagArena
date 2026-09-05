export const UserRole = {
  ADMIN: "admin",
  AUTHOR: "author",
  PLAYER: "player",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export const ChallengeCategory = {
  WEB: "web",
  CRYPTO: "crypto",
  FORENSICS: "forensics",
  REVERSE: "reverse",
  PWN: "pwn",
  OSINT: "osint",
  MISC: "misc",
} as const;
export type ChallengeCategory =
  (typeof ChallengeCategory)[keyof typeof ChallengeCategory];
export const ChallengeDifficulty = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
} as const;
export type ChallengeDifficulty =
  (typeof ChallengeDifficulty)[keyof typeof ChallengeDifficulty];
export const ChallengeStatus = {
  DRAFT: "draft",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  DISABLED: "disabled",
  ARCHIVED: "archived",
} as const;
export type ChallengeStatus =
  (typeof ChallengeStatus)[keyof typeof ChallengeStatus];
export const USER_ROLES = Object.values(UserRole);
export const CHALLENGE_CATEGORIES = Object.values(ChallengeCategory);
export const CHALLENGE_DIFFICULTIES = Object.values(ChallengeDifficulty);
export const CHALLENGE_STATUSES = Object.values(ChallengeStatus);
export const VISIBILITIES = ["public_practice", "event_only"] as const;
export const SUBMISSION_RESULTS = ["correct", "incorrect"] as const;
