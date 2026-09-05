import type {
  ChallengeCategory,
  ChallengeDifficulty,
  ChallengeStatus,
  UserRole,
} from "../constants/enums.js";

export interface UserDto {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isSuspended: boolean;
  isVerified: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}
export interface AuthSessionDto {
  user: UserDto;
  accessToken: string;
}
export interface PageDto<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export interface ResourceDto {
  id: string;
  label: string;
  url: string | null;
  filename: string | null;
  size: number | null;
}
export interface HintDto {
  id: string;
  position: number;
  cost: number;
  content: string | null;
  unlocked: boolean;
}
export interface ChallengeDto {
  id: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  status: ChallengeStatus;
  visibility: "public_practice" | "event_only";
  basePoints: number;
  currentPoints: number;
  solveCount: number;
  averageRating: number | null;
  reviewCount: number;
  authorId: string;
  authorName: string;
  solvedByMe: boolean;
  rejectionReason: string | null;
  connectionInfo: string;
  releasedAt: string | null;
  createdAt: string;
  resources: ResourceDto[];
  hints: HintDto[];
}
export interface EventDto {
  id: string;
  title: string;
  description: string;
  rules: string;
  startsAt: string;
  endsAt: string;
  status: "draft" | "scheduled" | "active" | "ended" | "archived";
  access: "open" | "invite_only";
  dynamicScoring: boolean;
  registered: boolean;
  participantCount: number;
  challengeIds: string[];
}
export interface ReviewDto {
  id: string;
  userId: string;
  username: string;
  rating: number;
  comment: string | null;
  hidden: boolean;
  createdAt: string;
}
export interface SubmissionOutcomeDto {
  result: "correct" | "incorrect" | "already_solved";
  pointsAwarded: number;
  attemptsRemaining: number;
  lockedUntil: string | null;
}
export interface LeaderboardRowDto {
  rank: number;
  userId: string;
  username: string;
  points: number;
  solveCount: number;
  lastSolveAt: string;
}
export interface ActivityDto {
  id: string;
  challengeId: string;
  title: string;
  eventId: string | null;
  result: string;
  points: number;
  createdAt: string;
}
export interface ScoreHistoryDto {
  players: LeaderboardRowDto[];
  points: { time: number; scores: Record<string, number> }[];
  me: LeaderboardRowDto | null;
  live: boolean;
}
export interface AuditDto {
  id: string;
  actorName: string;
  action: string;
  targetId: string;
  reason: string | null;
  createdAt: string;
}
export interface DashboardDto {
  stats: { label: string; value: number }[];
  activity: ActivityDto[];
  scoreHistory: { date: string; points: number }[];
  events: EventDto[];
  challenges: ChallengeDto[];
  hints: { title: string; content: string; cost: number }[];
  audit: AuditDto[];
}
export interface ApiErrorDto {
  message: string;
  code: string;
  details?: Record<string, string[]>;
  retryAfter?: number;
}
