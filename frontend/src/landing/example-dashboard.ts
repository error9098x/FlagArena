import type { ChallengeDto, DashboardDto, UserDto } from "@flagarena/shared";

export const exampleUsers = {
  player: { username: "Arjun Mehta", role: "player" },
  author: { username: "Mira Shah", role: "author" },
  admin: { username: "Nisha Rao", role: "admin" },
} satisfies Record<string, Pick<UserDto, "username" | "role">>;

const challenges: ChallengeDto[] = [
  {
    title: "Shift register",
    category: "crypto",
    status: "approved",
    basePoints: 100,
  },
  {
    title: "Packet trail",
    category: "forensics",
    status: "pending",
    basePoints: 200,
  },
  {
    title: "Header inspection",
    category: "web",
    status: "pending",
    basePoints: 150,
  },
].map((item, index) => ({
  ...item,
  category: item.category as ChallengeDto["category"],
  status: item.status as ChallengeDto["status"],
  id: `example-challenge-${index}`,
  description: "Illustrative challenge in the public preview.",
  difficulty: "easy",
  visibility: "public_practice",
  currentPoints: item.basePoints,
  solveCount: index === 0 ? 42 : 0,
  averageRating: null,
  reviewCount: 0,
  authorId: "example-author",
  authorName: "Mira Shah",
  solvedByMe: false,
  rejectionReason: null,
  connectionInfo: "",
  releasedAt: index === 0 ? "2026-09-01T09:00:00Z" : null,
  createdAt: "2026-09-01T09:00:00Z",
  resources: [],
  hints: [],
}));

export function exampleDashboard(role: UserDto["role"]): DashboardDto {
  return {
    stats:
      role === "admin"
        ? [
            { label: "Players", value: 124 },
            { label: "Authors", value: 6 },
            { label: "Admins", value: 2 },
            { label: "Suspended", value: 1 },
            { label: "Pending reviews", value: 2 },
            { label: "Published challenges", value: 18 },
          ]
        : [
            { label: "Practice score", value: 1450 },
            { label: "Practice rank", value: 4 },
            { label: "Practice solves", value: 9 },
            { label: "Attempted", value: 14 },
          ],
    scoreHistory: [0, 100, 350, 550, 550, 900, 1200, 1450].map(
      (points, index) => ({
        date: new Date(Date.UTC(2026, 7, 29 + index))
          .toISOString()
          .slice(0, 10),
        points,
      }),
    ),
    events: [
      {
        id: "example-event-1",
        title: "Midnight signal",
        description: "A community cryptography and forensics CTF.",
        rules: "Individual participation.",
        startsAt: "2026-09-12T15:00:00Z",
        endsAt: "2026-09-12T19:00:00Z",
        status: "scheduled",
        access: "open",
        dynamicScoring: false,
        registered: true,
        participantCount: 38,
        challengeIds: [],
      },
      {
        id: "example-event-2",
        title: "Autumn qualifier",
        description: "A qualifier for the club.",
        rules: "Individual participation.",
        startsAt: "2026-09-20T09:00:00Z",
        endsAt: "2026-09-20T13:00:00Z",
        status: "scheduled",
        access: "invite_only",
        dynamicScoring: true,
        registered: false,
        participantCount: 12,
        challengeIds: [],
      },
      {
        id: "example-event-3",
        title: "August capture",
        description: "The previous community CTF.",
        rules: "",
        startsAt: "2026-08-22T09:00:00Z",
        endsAt: "2026-08-22T15:00:00Z",
        status: "ended",
        access: "open",
        dynamicScoring: false,
        registered: true,
        participantCount: 61,
        challengeIds: [],
      },
    ],
    challenges:
      role === "admin"
        ? challenges.filter((challenge) => challenge.status === "pending")
        : role === "author"
          ? challenges
          : [],
    activity: [
      "Shift register",
      "Hidden in plain sight",
      "Request smuggling",
      "Archive recovery",
    ].map((title, index) => ({
      id: `example-submission-${index}`,
      challengeId:
        index === 0 ? "example-challenge-0" : `example-solved-${index}`,
      title,
      eventId: null,
      result: index === 1 ? "incorrect" : "correct",
      points: [100, 0, 150, 250][index]!,
      createdAt: `2026-09-05T${String(6 - index).padStart(2, "0")}:24:00Z`,
    })),
    hints: [],
    audit:
      role === "admin"
        ? [
            {
              id: "example-audit-1",
              actorName: "Nisha Rao",
              action: "challenge.approved",
              targetId: "example-challenge-0",
              reason: null,
              createdAt: "2026-09-05T06:30:00Z",
            },
            {
              id: "example-audit-2",
              actorName: "Nisha Rao",
              action: "event.created",
              targetId: "example-event-1",
              reason: null,
              createdAt: "2026-09-04T10:30:00Z",
            },
          ]
        : [],
  };
}
