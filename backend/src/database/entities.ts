import { EntitySchema } from "typeorm";
import type {
  UserRole,
  ChallengeCategory,
  ChallengeDifficulty,
  ChallengeStatus,
} from "@flagarena/shared";

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isVerified: boolean;
  isSuspended: boolean;
  mustChangePassword: boolean;
  tokenVersion: number;
  createdAt: Date;
}
export const UserEntity = new EntitySchema<User>({
  name: "User",
  tableName: "users",
  columns: {
    id: { type: "uuid", primary: true },
    username: { type: String, length: 32 },
    email: { type: String, unique: true },
    passwordHash: { name: "password_hash", type: String, select: false },
    role: { type: String },
    isVerified: { name: "is_verified", type: Boolean, default: false },
    isSuspended: { name: "is_suspended", type: Boolean, default: false },
    mustChangePassword: {
      name: "must_change_password",
      type: Boolean,
      default: false,
    },
    tokenVersion: { name: "token_version", type: Number, default: 0 },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
  },
});

export interface Challenge {
  id: string;
  authorId: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  status: ChallengeStatus;
  visibility: "public_practice" | "event_only";
  basePoints: number;
  flagHash: string;
  connectionInfo: string;
  rejectionReason: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  releasedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export const ChallengeEntity = new EntitySchema<Challenge>({
  name: "Challenge",
  tableName: "challenges",
  columns: {
    id: { type: "uuid", primary: true },
    authorId: { name: "author_id", type: "uuid" },
    title: { type: String },
    description: { type: String },
    category: { type: String },
    difficulty: { type: String },
    status: { type: String },
    visibility: { type: String },
    basePoints: { name: "base_points", type: Number },
    flagHash: { name: "flag_hash", type: String, select: false },
    connectionInfo: { name: "connection_info", type: String },
    rejectionReason: { name: "rejection_reason", type: String, nullable: true },
    approvedBy: { name: "approved_by", type: "uuid", nullable: true },
    approvedAt: { name: "approved_at", type: "timestamptz", nullable: true },
    releasedAt: { name: "released_at", type: "timestamptz", nullable: true },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamptz", updateDate: true },
  },
});

export interface Event {
  id: string;
  title: string;
  description: string;
  rules: string;
  startsAt: Date;
  endsAt: Date;
  status: "draft" | "scheduled" | "archived";
  access: "open" | "invite_only";
  joinCodeHash: string | null;
  dynamicScoring: boolean;
  createdAt: Date;
}
export const EventEntity = new EntitySchema<Event>({
  name: "Event",
  tableName: "events",
  columns: {
    id: { type: "uuid", primary: true },
    title: { type: String },
    description: { type: String },
    rules: { type: String },
    startsAt: { name: "starts_at", type: "timestamptz" },
    endsAt: { name: "ends_at", type: "timestamptz" },
    status: { type: String },
    access: { type: String },
    joinCodeHash: {
      name: "join_code_hash",
      type: String,
      nullable: true,
      select: false,
    },
    dynamicScoring: { name: "dynamic_scoring", type: Boolean },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true },
  },
});
