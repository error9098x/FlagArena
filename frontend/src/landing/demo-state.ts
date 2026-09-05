import type { ChallengeDto } from "@flagarena/shared";

export type DemoRole = "player" | "author" | "admin";
export type DemoChallenge = {
  id: string;
  title: string;
  description: string;
  category: ChallengeDto["category"];
  difficulty: "easy" | "medium" | "hard";
  points: number;
  solves: number;
  visibility: "public_practice" | "event_only";
  performance?: { players: number; medianMinutes: number; hintUsers: number };
  flag: string;
  fileName: string;
  fileContent: string;
  fileData?: string;
  resourceUrl: string;
  hint: string;
  status: "draft" | "pending" | "approved" | "rejected";
  reason: string;
};
export type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: DemoRole;
  suspended: boolean;
};
export type DemoEvent = {
  id: string;
  title: string;
  description: string;
  starts: string;
  ends: string;
  status: "active" | "scheduled" | "ended";
  dynamic: boolean;
  registered: boolean;
  participants: number;
  challenges: string[];
};
export type DemoAttempt = {
  id: string;
  challengeId: string;
  correct: boolean;
  points: number;
  at: string;
  eventId?: string;
};
export type DemoState = {
  role: DemoRole;
  challenges: DemoChallenge[];
  users: DemoUser[];
  attempts: DemoAttempt[];
  events: DemoEvent[];
  audit: { text: string; at: string }[];
};
export const categories = [
  "web",
  "crypto",
  "forensics",
  "reverse",
  "pwn",
  "osint",
  "misc",
] as const;
export const categoryLabels = {
  web: "Web",
  crypto: "Crypto",
  forensics: "Forensics",
  reverse: "Reverse engineering",
  pwn: "Pwn",
  osint: "OSINT",
  misc: "Miscellaneous",
};
const baseTime = "2026-09-05T12:00:00Z";
const rows: [
  string,
  string,
  DemoChallenge["category"],
  number,
  string,
  string,
  string,
][] = [
  [
    "headers",
    "Header inspection",
    "web",
    150,
    "Inspect an HTTP response from the archive service. The flag is present in the response metadata, outside the HTML body.",
    "headers.http",
    "HTTP/1.1 200 OK\nContent-Type: text/html\nX-Arena-Flag: flagarena{look_at_the_headers}\n\n<h1>Archive service</h1>",
  ],
  [
    "cipher",
    "Shift register",
    "crypto",
    100,
    "Recover a message encoded with a rotation cipher. The note includes the rotation used by its sender.",
    "cipher.txt",
    "ROT13\nsyntneran{ebgngvba}",
  ],
  [
    "trail",
    "Packet trail",
    "forensics",
    200,
    "Trace a message in an exported network log and recover the plaintext payload.",
    "network.log",
    "09:40:01 GET /health 200\n09:40:03 POST /message payload=flagarena{follow_the_trail}",
  ],
  [
    "bytes",
    "Byte by byte",
    "reverse",
    250,
    "Read a disassembled validation routine and reconstruct the expected input from its byte constants.",
    "routine.txt",
    "expected_ascii = [102,108,97,103,97,114,101,110,97,123,98,121,116,101,115,125]",
  ],
  [
    "stack",
    "Stack notes",
    "pwn",
    300,
    "Inspect a stack snapshot captured immediately after a failed input check. Recover the adjacent secret value.",
    "stack.txt",
    "0x00 user_buffer\n0x20 secret = flagarena{stack_notes}\n0x40 return_address",
  ],
  [
    "footprint",
    "Public footprint",
    "osint",
    150,
    "Correlate archived profile records to identify the project codename. No external accounts or tools are required.",
    "profiles.csv",
    "name,project\nRhea,nightwatch\nflag,flagarena{nightwatch}",
  ],
  [
    "archive",
    "Archive recovery",
    "forensics",
    250,
    "Recover the flag from a partially restored archive index. Entries marked deleted still retain their original content.",
    "archive.txt",
    "entry: notes.txt\nstate: deleted\ncontent: flagarena{recovered}",
  ],
  [
    "plain",
    "Hidden in plain sight",
    "misc",
    100,
    "A document has an unexpected annotation. Inspect the original source rather than its rendered contents.",
    "document.html",
    "<h1>Meeting notes</h1>\n<!-- flagarena{source_matters} -->",
  ],
  [
    "signature",
    "Broken signature",
    "crypto",
    350,
    "An exported verification report records the plaintext before signing. Find the value that was actually signed.",
    "signature.log",
    "algorithm: SHA256\ninput: flagarena{before_signing}\nresult: signature mismatch",
  ],
  [
    "token",
    "Token exchange",
    "web",
    200,
    "Inspect a captured token exchange and locate the claim containing the flag.",
    "claims.json",
    '{"subject":"archive-reader","arena":"flagarena{read_the_claims}"}',
  ],
  [
    "sector",
    "The last sector",
    "forensics",
    400,
    "Search a disk recovery report for a text fragment recovered outside the active filesystem.",
    "sectors.txt",
    "sector 127: empty\nsector 128: flagarena{last_sector}",
  ],
  [
    "format",
    "Format string",
    "pwn",
    450,
    "An application log includes a memory string from an unsafe formatter. Extract the value from the diagnostic line.",
    "formatter.log",
    "printf diagnostic: leaked string = flagarena{format_checked}",
  ],
];
const flags = [
  "look_at_the_headers",
  "rotation",
  "follow_the_trail",
  "bytes",
  "stack_notes",
  "nightwatch",
  "recovered",
  "source_matters",
  "before_signing",
  "read_the_claims",
  "last_sector",
  "format_checked",
];
const additionalRows: [
  string,
  string,
  DemoChallenge["category"],
  number,
  string,
  string,
  string,
  DemoChallenge["visibility"],
][] = [
  [
    "Cookie jar",
    "Cookie jar",
    "web",
    100,
    "Inspect a captured session and identify the hidden state value.",
    "cookies.txt",
    "flagarena{cookie_jar}",
    "public_practice",
  ],
  [
    "Query order",
    "Query order",
    "web",
    200,
    "Follow a request trace and recover the value recorded after the final parameter.",
    "request.txt",
    "flagarena{query_order}",
    "public_practice",
  ],
  [
    "JWT audience",
    "JWT audience",
    "web",
    250,
    "Inspect a token claim and identify the intended audience.",
    "token.json",
    "flagarena{jwt_audience}",
    "public_practice",
  ],
  [
    "Tiny template",
    "Tiny template",
    "web",
    350,
    "Read the source template and recover the annotation hidden in a comment.",
    "template.txt",
    "flagarena{tiny_template}",
    "public_practice",
  ],
  [
    "Vigenere postcard",
    "Vigenere postcard",
    "crypto",
    150,
    "Recover the message from a short repeating-key cipher.",
    "postcard.txt",
    "flagarena{vigenere}",
    "public_practice",
  ],
  [
    "Public exponent",
    "Public exponent",
    "crypto",
    250,
    "Use the supplied RSA notes to recover the small plaintext.",
    "rsa-notes.txt",
    "flagarena{public_exponent}",
    "public_practice",
  ],
  [
    "Hash collision course",
    "Hash collision course",
    "crypto",
    400,
    "Compare two digest records and identify the message attached to the collision.",
    "hashes.txt",
    "flagarena{hash_collision}",
    "public_practice",
  ],
  [
    "One-time pad",
    "One-time pad",
    "crypto",
    300,
    "Read the pad and recover the message it protects.",
    "pad.txt",
    "flagarena{one_time_pad}",
    "public_practice",
  ],
  [
    "Exif after dark",
    "Exif after dark",
    "forensics",
    200,
    "Inspect the metadata sidecar for the photographer's comment.",
    "photo.exif.txt",
    "flagarena{exif_after_dark}",
    "public_practice",
  ],
  [
    "Log rotation",
    "Log rotation",
    "forensics",
    350,
    "Search rotated logs for the recovered value.",
    "rotate.log",
    "flagarena{log_rotation}",
    "public_practice",
  ],
  [
    "Memory map",
    "Memory map",
    "reverse",
    250,
    "Use the memory map to find the value in the data segment.",
    "memory.map",
    "flagarena{memory_map}",
    "public_practice",
  ],
  [
    "Opcode alphabet",
    "Opcode alphabet",
    "reverse",
    300,
    "Decode the byte sequence and recover the answer.",
    "opcodes.txt",
    "flagarena{opcode}",
    "public_practice",
  ],
  [
    "Strongest RSA",
    "Strongest RSA",
    "crypto",
    250,
    "Recover a small message from the public exponent notes.",
    "rsa-event.txt",
    "flagarena{strongest_rsa}",
    "event_only",
  ],
  [
    "Signal in the noise",
    "Signal in the noise",
    "forensics",
    300,
    "Separate the carrier line from a noisy incident log.",
    "signal.log",
    "flagarena{signal_noise}",
    "event_only",
  ],
  [
    "Binary flood",
    "Binary flood",
    "reverse",
    350,
    "Decode the binary evidence and verify the second-stage value.",
    "binary.txt",
    "flagarena{binary_flood}",
    "event_only",
  ],
  [
    "Robots.txt",
    "Robots.txt",
    "web",
    100,
    "Inspect the crawler policy and its source comment.",
    "robots.txt",
    "flagarena{robots_rule}",
    "event_only",
  ],
  [
    "DNS archaeology",
    "DNS archaeology",
    "osint",
    250,
    "Correlate an old TXT record with its owner note.",
    "dns.txt",
    "flagarena{dns_archaeology}",
    "event_only",
  ],
  [
    "Lost assignment",
    "Lost assignment",
    "misc",
    100,
    "Find the final submission in a recovered assignment file.",
    "assignment.txt",
    "flagarena{lost_assignment}",
    "event_only",
  ],
  [
    "Heap diary",
    "Heap diary",
    "pwn",
    500,
    "Inspect a heap snapshot and locate the freed secret.",
    "heap.txt",
    "flagarena{heap_diary}",
    "event_only",
  ],
  [
    "Canvas coordinates",
    "Canvas coordinates",
    "osint",
    250,
    "Use the coordinate record to identify the pinned caption.",
    "coordinates.txt",
    "flagarena{canvas_coordinates}",
    "event_only",
  ],
  [
    "Morse relay",
    "Morse relay",
    "misc",
    150,
    "Decode the relay and verify the plain-text answer.",
    "relay.txt",
    "flagarena{morse_relay}",
    "event_only",
  ],
  [
    "Auth bypass",
    "Auth bypass",
    "web",
    450,
    "Explain the skipped check in an authentication trace.",
    "auth.log",
    "flagarena{auth_bypass}",
    "event_only",
  ],
  [
    "ElGamal postcard",
    "ElGamal postcard",
    "crypto",
    450,
    "Derive the shared secret from the supplied postcard.",
    "elgamal.txt",
    "flagarena{elgamal_postcard}",
    "event_only",
  ],
  [
    "Threaded evidence",
    "Threaded evidence",
    "forensics",
    300,
    "Find the useful message in a threaded incident export.",
    "threads.txt",
    "flagarena{threaded_evidence}",
    "event_only",
  ],
  [
    "Function pointer",
    "Function pointer",
    "reverse",
    450,
    "Follow the call graph to its final value.",
    "symbols.txt",
    "flagarena{function_pointer}",
    "event_only",
  ],
  [
    "Zero-day journal",
    "Zero-day journal",
    "pwn",
    350,
    "Read the observation attached to a vulnerability journal entry.",
    "journal.txt",
    "flagarena{zero_day_journal}",
    "event_only",
  ],
  [
    "Alias trail",
    "Alias trail",
    "osint",
    150,
    "Match an old alias to its current identity.",
    "aliases.txt",
    "flagarena{alias_trail}",
    "event_only",
  ],
  [
    "Nested archive",
    "Nested archive",
    "misc",
    350,
    "Follow a nested archive tree to the answer file.",
    "archive-tree.txt",
    "flagarena{nested_archive}",
    "event_only",
  ],
];
export function seedDemo(role: DemoRole = "player"): DemoState {
  const allRows = [
    ...rows.map(
      (row, i) => [...row, i < 8 ? "public_practice" : "event_only"] as const,
    ),
    ...additionalRows,
  ];
  const challenges: DemoChallenge[] = allRows.map(
    (
      [
        id,
        title,
        category,
        points,
        description,
        fileName,
        fileContent,
        visibility,
      ],
      i,
    ) => ({
      id,
      title,
      category,
      points,
      description,
      visibility,
      fileName,
      fileContent,
      resourceUrl: "",
      difficulty: points <= 150 ? "easy" : points <= 300 ? "medium" : "hard",
      solves:
        role !== "player" && [8, 10, 11].includes(i)
          ? 0
          : ([54, 42, 38, 23, 17, 31, 26, 61, 12, 29, 8, 6][i] ??
            12 + ((i * 17) % 55)),
      performance:
        role !== "player" && [8, 10, 11].includes(i)
          ? undefined
          : {
              players:
                [72, 58, 76, 64, 94, 52, 69, 78, 54, 62, 43, 39][i] ??
                70 + ((i * 11) % 25),
              medianMinutes:
                [8, 12, 24, 38, 67, 19, 42, 6, 58, 26, 74, 81][i] ??
                14 + ((i * 7) % 48),
              hintUsers:
                [11, 15, 28, 35, 61, 12, 28, 8, 32, 19, 29, 27][i] ??
                8 + ((i * 5) % 26),
            },
      flag: i < flags.length ? `flagarena{${flags[i]}}` : fileContent,
      hint:
        i === 1
          ? "ROT13 maps A to N and B to O. Leave braces and punctuation unchanged."
          : i === 3
            ? "Convert each decimal byte value to an ASCII character."
            : "Open the supplied file as text and examine its metadata and diagnostic fields.",
      status:
        role === "player"
          ? "approved"
          : i === 10
            ? "pending"
            : i === 11
              ? "draft"
              : i === 8
                ? "pending"
                : "approved",
      reason: "",
    }),
  );
  return {
    role,
    challenges,
    users: [
      "Arjun Mehta",
      "Mira Shah",
      "Nisha Rao",
      "Dev Kapoor",
      "Rhea Sen",
      "Kabir Sethi",
      "Ishan Das",
      "Leena Roy",
    ].map((name, i) => ({
      id: `user-${i}`,
      name,
      email: `${name.split(" ")[0]!.toLowerCase()}@flagarena.test`,
      role: i === 2 ? "admin" : i === 1 || i === 3 ? "author" : "player",
      suspended: i === 7,
    })),
    attempts: ["cipher", "trail", "plain", "footprint"].map((id, i) => ({
      id: `past-${i}`,
      challengeId: id,
      correct: true,
      points: challenges.find((c) => c.id === id)!.points,
      at: `2026-09-0${4 - i}T10:30:00Z`,
    })),
    events: [
      {
        id: "midnight",
        title: "Midnight signal",
        description:
          "An individual competition covering HTTP analysis, cryptography, and forensics.",
        starts: "2026-09-05T09:00",
        ends: "2026-09-05T23:00",
        status: "active",
        dynamic: false,
        registered: false,
        participants: 38,
        challenges: ["headers", "cipher", "trail", "bytes"],
      },
      {
        id: "qualifier",
        title: "Autumn qualifier",
        description:
          "A three-challenge qualifier for the security club’s next competition.",
        starts: "2026-09-20T09:00",
        ends: "2026-09-20T18:00",
        status: "scheduled",
        dynamic: true,
        registered: false,
        participants: 24,
        challenges: ["stack", "signature", "sector"],
      },
      {
        id: "august",
        title: "August capture",
        description: "Final results from the August community competition.",
        starts: "2026-08-22T09:00",
        ends: "2026-08-22T18:00",
        status: "ended",
        dynamic: false,
        registered: true,
        participants: 61,
        challenges: ["plain", "archive", "token"],
      },
    ],
    audit: [
      { text: "Mira Shah submitted Broken signature for review", at: baseTime },
      {
        text: "Nisha Rao published Midnight signal",
        at: "2026-09-04T14:20:00Z",
      },
    ],
  };
}
export function demoScore(state: DemoState, eventId?: string) {
  return state.attempts
    .filter((a) => a.eventId === eventId)
    .reduce((sum, a) => sum + a.points, 0);
}
export type DemoAction =
  | { type: "save"; challenge: DemoChallenge; at: string }
  | { type: "review"; id: string; approve: boolean; reason: string; at: string }
  | {
      type: "submit";
      id: string;
      flag: string;
      attemptId: string;
      at: string;
      eventId?: string;
    }
  | { type: "join"; id: string }
  | { type: "user"; user: DemoUser; at: string }
  | { type: "event"; event: DemoEvent; at: string };
export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  if (action.type === "join")
    return state.role !== "player"
      ? state
      : {
          ...state,
          events: state.events.map((e) =>
            e.id === action.id && e.status !== "ended"
              ? {
                  ...e,
                  registered: !e.registered,
                  participants: e.participants + (e.registered ? -1 : 1),
                }
              : e,
          ),
        };
  const audit = (text: string, at: string) => [{ text, at }, ...state.audit];
  if (action.type === "user") {
    if (state.role !== "admin" || action.user.id === "user-2") return state;
    return {
      ...state,
      users: state.users.map((u) =>
        u.id === action.user.id ? action.user : u,
      ),
      audit: audit(`Nisha Rao updated ${action.user.name}`, action.at),
    };
  }
  if (action.type === "event")
    return state.role !== "admin"
      ? state
      : {
          ...state,
          events: [
            ...state.events.filter((e) => e.id !== action.event.id),
            action.event,
          ],
          audit: audit(`Nisha Rao saved ${action.event.title}`, action.at),
        };
  if (action.type === "save") {
    if (
      state.role === "player" ||
      !action.challenge.title.trim() ||
      !action.challenge.flag.trim() ||
      action.challenge.points < 10
    )
      return state;
    return {
      ...state,
      challenges: [
        ...state.challenges.filter((c) => c.id !== action.challenge.id),
        action.challenge,
      ],
      audit: audit(
        `${action.challenge.title}: ${action.challenge.status === "pending" ? "submitted for review" : "saved"}`,
        action.at,
      ),
    };
  }
  const challenge = state.challenges.find((c) => c.id === action.id);
  if (!challenge) return state;
  if (action.type === "review") {
    if (
      state.role !== "admin" ||
      challenge.status !== "pending" ||
      (!action.approve && !action.reason.trim())
    )
      return state;
    return {
      ...state,
      challenges: state.challenges.map((c) =>
        c.id === action.id
          ? {
              ...c,
              status: action.approve ? "approved" : "rejected",
              reason: action.approve ? "" : action.reason,
            }
          : c,
      ),
      audit: audit(
        `${challenge.title}: ${action.approve ? "published" : "changes requested"}`,
        action.at,
      ),
    };
  }
  if (state.role !== "player" || challenge.status !== "approved") return state;
  if (
    action.eventId &&
    !state.events.some(
      (e) =>
        e.id === action.eventId &&
        e.registered &&
        e.status === "active" &&
        e.challenges.includes(challenge.id),
    )
  )
    return state;
  const correct = action.flag.trim() === challenge.flag;
  const duplicate = state.attempts.some(
    (a) =>
      a.challengeId === action.id && a.correct && a.eventId === action.eventId,
  );
  return {
    ...state,
    attempts: [
      {
        id: action.attemptId,
        challengeId: action.id,
        correct,
        points: correct && !duplicate ? challenge.points : 0,
        at: action.at,
        eventId: action.eventId,
      },
      ...state.attempts,
    ],
  };
}
