import type {
  ActivityDto,
  AuditDto,
  ChallengeDto,
  DashboardDto,
  EventDto,
  LeaderboardRowDto,
  PageDto,
  ReviewDto,
  UserDto,
} from "@flagarena/shared";

const id = (value: number) =>
  `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const ago = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString();
export function previewUser(): UserDto {
  const role = sessionStorage.getItem("flagarena-preview");
  return {
    id: id(role === "admin" ? 3 : role === "author" ? 2 : 1),
    username:
      role === "admin" ? "Admin" : role === "author" ? "Mira" : "Aviral",
    email: "preview@example.test",
    role: role === "admin" || role === "author" ? role : "player",
    isSuspended: false,
    isVerified: true,
    mustChangePassword: false,
    createdAt: ago(30),
  };
}
const titles = [
  "Packet trail",
  "Shift register",
  "Hidden in plain sight",
  "Broken signature",
  "Stack notes",
  "Archive recovery",
  "Header inspection",
  "Byte by byte",
  "Public footprint",
  "The last sector",
  "Format string",
  "Token exchange",
];
const categories: ChallengeDto["category"][] = [
  "forensics",
  "crypto",
  "misc",
  "crypto",
  "pwn",
  "forensics",
  "web",
  "reverse",
  "osint",
  "forensics",
  "pwn",
  "web",
];
export const previewChallenges: ChallengeDto[] = titles.map((title, index) => ({
  id: id(100 + index),
  title,
  description:
    "Inspect the supplied file and identify the flag.\n\nThe resource contains all the information needed to complete this challenge. Submit the flag exactly as it appears.\n\n## File information\n\nUse the file contents and metadata to reconstruct the original message.",
  category: categories[index]!,
  difficulty: index % 3 === 0 ? "easy" : index % 3 === 1 ? "medium" : "hard",
  status: index === 10 ? "pending" : index === 11 ? "draft" : "approved",
  visibility: index > 7 ? "event_only" : "public_practice",
  basePoints: [100, 200, 150, 300, 400, 250][index % 6]!,
  currentPoints: [100, 200, 150, 300, 400, 250][index % 6]!,
  solveCount: [42, 28, 36, 17, 9, 21, 54, 12, 0, 0, 0, 0][index]!,
  averageRating: 4.3,
  reviewCount: 8,
  authorId: index % 2 === 0 ? id(2) : id(4),
  authorName: index % 2 === 0 ? "Mira" : "Dev",
  solvedByMe: [0, 2, 6].includes(index),
  rejectionReason: null,
  connectionInfo: "",
  releasedAt: index < 10 ? ago(18) : null,
  createdAt: ago(20 - index),
  resources: [
    {
      id: id(500 + index),
      label: "Challenge file",
      filename: "evidence.txt",
      size: 2048,
      url: null,
    },
  ],
  hints: [
    {
      id: id(600 + index),
      position: 0,
      cost: 20,
      content: null,
      unlocked: false,
    },
  ],
}));
const events: EventDto[] = [
  {
    id: id(200),
    title: "September practice CTF",
    description: "Individual competition with six file-based challenges.",
    rules:
      "Submit flags using your own account. Sharing flags during the event is not permitted.",
    startsAt: ago(0.08),
    endsAt: ago(-0.17),
    status: "active",
    access: "open",
    dynamicScoring: false,
    registered: true,
    participantCount: 38,
    challengeIds: previewChallenges.slice(0, 6).map((c) => c.id),
  },
  {
    id: id(201),
    title: "Club qualifier",
    description: "An invite-only event for community members.",
    rules: "Individual participation only.",
    startsAt: ago(-3),
    endsAt: ago(-3.2),
    status: "scheduled",
    access: "invite_only",
    dynamicScoring: true,
    registered: false,
    participantCount: 12,
    challengeIds: [],
  },
  {
    id: id(202),
    title: "August CTF",
    description: "The August community competition.",
    rules: "",
    startsAt: ago(12),
    endsAt: ago(11.7),
    status: "ended",
    access: "open",
    dynamicScoring: false,
    registered: true,
    participantCount: 61,
    challengeIds: previewChallenges.slice(2, 7).map((c) => c.id),
  },
];
const leaderboard: LeaderboardRowDto[] = [
  "Nisha",
  "Arjun",
  "Mira",
  "Aviral",
  "Kabir",
  "Dev",
  "Rhea",
  "Ishan",
].map((username, index) => ({
  rank: index + 1,
  userId: id(index === 3 ? 1 : 20 + index),
  username,
  points: [1950, 1800, 1650, 1450, 1300, 1200, 950, 700][index]!,
  solveCount: 12 - index,
  lastSolveAt: ago(index / 20),
}));
const activity: ActivityDto[] = previewChallenges
  .slice(0, 5)
  .map((challenge, index) => ({
    id: id(700 + index),
    challengeId: challenge.id,
    title: challenge.title,
    eventId: null,
    result: index === 1 ? "incorrect" : "correct",
    points: index === 1 ? 0 : challenge.basePoints,
    createdAt: ago(index / 4),
  }));
const audit: AuditDto[] = [
  {
    id: id(800),
    actorName: "Admin",
    action: "challenge.approved",
    targetId: id(100),
    reason: null,
    createdAt: ago(0.1),
  },
  {
    id: id(801),
    actorName: "Admin",
    action: "event.created",
    targetId: id(200),
    reason: null,
    createdAt: ago(1),
  },
];
function paginate<T>(items: T[], params: Record<string, unknown>): PageDto<T> {
  const page = Number(params.page ?? 1);
  const limit = Number(params.limit ?? 20);
  return {
    items: items.slice((page - 1) * limit, page * limit),
    total: items.length,
    page,
    limit,
  };
}
export function previewRead(
  path: string,
  params: Record<string, unknown> = {},
): unknown {
  const user = previewUser();
  if (path === "/dashboard") {
    const result: DashboardDto = {
      stats:
        user.role === "admin"
          ? [
              { label: "Players", value: 124 },
              { label: "Authors", value: 6 },
              { label: "Admins", value: 2 },
              { label: "Suspended", value: 1 },
              { label: "Pending reviews", value: 1 },
              { label: "Published challenges", value: 10 },
            ]
          : [
              { label: "Practice score", value: 1450 },
              { label: "Practice rank", value: 4 },
              { label: "Practice solves", value: 9 },
              { label: "Attempted", value: 14 },
            ],
      activity,
      scoreHistory: [0, 100, 350, 550, 550, 900, 1200, 1450].map(
        (points, i) => ({ date: ago(7 - i).slice(0, 10), points }),
      ),
      events,
      challenges: previewChallenges.filter((c) =>
        user.role === "admin" ? c.status === "pending" : c.authorId === user.id,
      ),
      hints: [],
      audit,
    };
    return result;
  }
  if (path === "/challenges") {
    let items = previewChallenges.filter((c) =>
      params.view === "manage"
        ? user.role === "admin" || c.authorId === user.id
        : c.status === "approved" &&
          (params.eventId
            ? events
                .find((e) => e.id === params.eventId)
                ?.challengeIds.includes(c.id)
            : c.visibility === "public_practice"),
    );
    for (const key of [
      "category",
      "difficulty",
      "visibility",
      "status",
      "authorId",
    ] as const)
      if (params[key]) items = items.filter((c) => c[key] === params[key]);
    if (params.search)
      items = items.filter((c) =>
        c.title.toLowerCase().includes(String(params.search).toLowerCase()),
      );
    if (params.solved)
      items = items.filter((c) => c.solvedByMe === (params.solved === "true"));
    if (params.minPoints)
      items = items.filter((c) => c.basePoints >= Number(params.minPoints));
    if (params.maxPoints)
      items = items.filter((c) => c.basePoints <= Number(params.maxPoints));
    if (params.minSolves)
      items = items.filter((c) => c.solveCount >= Number(params.minSolves));
    if (params.maxSolves)
      items = items.filter((c) => c.solveCount <= Number(params.maxSolves));
    if (params.used)
      items = items.filter(
        (c) =>
          events.some((e) => e.challengeIds.includes(c.id)) ===
          (params.used === "true"),
      );
    if (params.sortBy === "points")
      items.sort((a, b) => b.basePoints - a.basePoints);
    if (params.sortBy === "solveCount")
      items.sort((a, b) => b.solveCount - a.solveCount);
    if (params.sortBy === "title")
      items.sort((a, b) => a.title.localeCompare(b.title));
    return paginate(items, params);
  }
  if (path === "/challenges/authors")
    return [
      { id: id(2), username: "Mira" },
      { id: id(4), username: "Dev" },
    ].filter((author) => user.role === "admin" || author.id === user.id);
  if (/^\/challenges\/[^/]+\/my-review$/.test(path)) {
    const challenge = previewChallenges.find(
      (c) => c.id === path.split("/")[2],
    );
    return {
      review: null,
      canReview:
        !!challenge?.solvedByMe &&
        user.role !== "admin" &&
        user.id !== challenge.authorId,
    };
  }
  if (/^\/challenges\/[^/]+\/reviews$/.test(path))
    return paginate<ReviewDto>(
      [
        {
          id: id(900),
          userId: id(22),
          username: "Nisha",
          rating: 4,
          comment:
            "The supplied evidence is sufficient to reproduce the result.",
          hidden: false,
          createdAt: ago(2),
        },
      ],
      params,
    );
  if (path.startsWith("/challenges/")) {
    const challenge = previewChallenges.find(
      (c) => c.id === path.split("/")[2],
    );
    if (!challenge) throw new Error("Challenge not found");
    return {
      ...challenge,
      hints: challenge.hints.map((hint) => ({
        ...hint,
        content:
          user.role === "admin" || user.id === challenge.authorId
            ? "Inspect the file header before decoding the body."
            : null,
      })),
    };
  }
  if (path === "/events")
    return paginate(
      events.filter((e) =>
        params.scope === "live"
          ? e.status === "active"
          : params.scope === "upcoming"
            ? e.status === "scheduled"
            : params.scope === "past"
              ? e.status === "ended"
              : true,
      ),
      params,
    );
  if (path.endsWith("/attendance"))
    return paginate(
      leaderboard.map((player) => ({
        id: player.userId,
        username: player.username,
        joinedAt: ago(1),
        attendedAt: player.lastSolveAt,
      })),
      params,
    );
  if (path.startsWith("/events/"))
    return events.find((e) => e.id === path.split("/")[2]);
  if (path === "/leaderboard")
    return paginate(
      leaderboard.filter((player) =>
        player.username
          .toLowerCase()
          .includes(String(params.search ?? "").toLowerCase()),
      ),
      params,
    );
  if (path === "/leaderboard/history") {
    const selected = params.players
      ? String(params.players).split(",")
      : [
          ...new Set([
            ...leaderboard.slice(0, 5).map((player) => player.userId),
            user.id,
          ]),
        ];
    const players = leaderboard.filter((player) =>
      selected.includes(player.userId),
    );
    return {
      players,
      me: leaderboard.find((player) => player.userId === user.id) ?? null,
      live:
        events.find((event) => event.id === params.eventId)?.status ===
        "active",
      points: Array.from({ length: 12 }, (_, step) => ({
        time: Date.now() - (11 - step) * 3600000,
        scores: Object.fromEntries(
          players.map((player, index) => [
            player.userId,
            step === 11
              ? player.points
              : Math.floor(
                  (player.points * Math.max(0, step - (index % 3))) / 11,
                ),
          ]),
        ),
      })),
    };
  }
  if (path === "/dashboard/activity") return paginate(activity, params);
  if (path === "/dashboard/author-analytics")
    return paginate(
      previewChallenges
        .filter((c) => c.authorId === user.id)
        .map((c) => ({
          id: c.id,
          title: c.title,
          status: c.status,
          attempts: c.solveCount * 3,
          solves: c.solveCount,
          rating: c.averageRating,
        })),
      params,
    );
  if (path === "/admin/audit") return paginate(audit, params);
  if (path === "/admin/solves")
    return paginate(
      activity
        .filter((a) => a.result === "correct")
        .map((a) => ({
          id: a.id,
          username: "Aviral",
          title: a.title,
          context: "practice",
          points: a.points,
          originalPoints: a.points,
          invalidated: false,
          createdAt: a.createdAt,
        })),
      params,
    );
  if (path === "/admin/users")
    return paginate<UserDto>(
      ["Aviral", "Mira", "Admin", "Dev", "Nisha"].map((username, i) => ({
        id: id(i + 1),
        username,
        email: `${username.toLowerCase()}@example.test`,
        role: i === 2 ? "admin" : i === 1 || i === 3 ? "author" : "player",
        isVerified: true,
        isSuspended: false,
        mustChangePassword: false,
        createdAt: ago(30),
      })),
      params,
    );
  throw new Error("Preview data is unavailable for this page");
}
