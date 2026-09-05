import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import bcrypt from "bcrypt";
import db from "../../config/data-source.js";
import { UserEntity, ChallengeEntity, EventEntity } from "../entities.js";
import { hashSecret } from "../../auth/secrets.js";
import { passwordSchema } from "@flagarena/shared";
import { seededChallenges } from "./challenge-manifest.js";

const demoDeployment =
  process.env.DEMO_MODE === "1" &&
  process.env.SEED_CONFIRM === "demo-deployment" &&
  Boolean(process.env.SEED_PASSWORD);
const localDevelopment =
  process.env.NODE_ENV !== "production" &&
  process.env.SEED_CONFIRM === "development-only";
if (!demoDeployment && !localDevelopment)
  throw new Error(
    "Use SEED_CONFIRM=development-only locally, or DEMO_MODE=1, SEED_CONFIRM=demo-deployment and an explicit SEED_PASSWORD for a demo deployment",
  );
const id = (value: number) =>
  `10000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const password = passwordSchema.parse(
  process.env.SEED_PASSWORD ?? "FlagArena-demo-2026!",
);
const samplesOnly = process.env.SEED_SAMPLES_ONLY === "1";
const uploads = resolve(process.env.UPLOAD_DIR ?? "../var/uploads");
await mkdir(uploads, { recursive: true, mode: 0o700 });
await db.initialize();
try {
  const existingAdmin = await db
    .getRepository(UserEntity)
    .findOneBy({ role: "admin", isSuspended: false });
  if (samplesOnly && !existingAdmin)
    throw new Error("Create the initial Admin before adding sample challenges");
  const adminId = existingAdmin?.id ?? id(1);
  const authorId = samplesOnly ? adminId : id(2);
  const passwordHash = await bcrypt.hash(password, 12);
  await db.transaction(async (manager) => {
    for (const [index, role] of (
      ["admin", "author", "player"] as const
    ).entries()) {
      if (samplesOnly || (role === "admin" && existingAdmin)) continue;
      await manager
        .createQueryBuilder()
        .insert()
        .into(UserEntity)
        .values({
          id: id(index + 1),
          username: `Demo ${role}`,
          email: `${role}@example.test`,
          role,
          passwordHash,
          isVerified: true,
        })
        .orIgnore()
        .execute();
    }
    if (!samplesOnly) {
      const fixtures = [
        ["Asha Iyer", "player"],
        ["Rohan Gupta", "player"],
        ["Sana Khan", "player"],
        ["Vikram Shah", "player"],
        ["Tara Bose", "player"],
        ["Neel Joshi", "player"],
        ["Ira Menon", "player"],
        ["Kabir Sethi", "player"],
        ["Leena Roy", "player"],
        ["Dev Kapoor", "author"],
        ["Mira Shah", "author"],
        ["Omar Khan", "author"],
        ["Priya Nair", "author"],
        ["Nisha Rao", "admin"],
        ["Farah Ali", "player"],
        ["Arman Das", "player"],
        ["Jaya Pillai", "player"],
      ] as const;
      for (const [index, [username, role]] of fixtures.entries()) {
        const userId = id(4 + index);
        await manager
          .createQueryBuilder()
          .insert()
          .into(UserEntity)
          .values({
            id: userId,
            username,
            email: `${username.toLowerCase().replaceAll(" ", ".")}@flagarena.test`,
            role,
            passwordHash,
            isVerified: true,
            isSuspended: username === "Leena Roy",
          })
          .orIgnore()
          .execute();
      }
    }
    for (const material of seededChallenges) {
      const challengeId = material.id;
      const flagHash = await hashSecret(material.flag);
      await manager
        .createQueryBuilder()
        .insert()
        .into(ChallengeEntity)
        .values({
          id: challengeId,
          title: material.title,
          description: `Inspect the supplied ${material.file} file and identify the flag. All required information is contained in this local resource.`,
          category: material.category,
          difficulty: material.difficulty,
          authorId,
          status: "approved",
          visibility: material.visibility,
          basePoints: material.points,
          flagHash,
          connectionInfo: "",
          approvedBy: adminId,
          approvedAt: new Date(),
          releasedAt: new Date(),
        })
        .orIgnore()
        .execute();
      // Keep reruns deterministic when an older development seed already
      // created one of these stable fixture IDs (for example, id 102).
      await manager.query(
        "UPDATE challenges SET title=$2,description=$3,category=$4,difficulty=$5,status='approved',visibility=$6,base_points=$7,flag_hash=$8,approved_by=$9,approved_at=COALESCE(approved_at,now()),released_at=COALESCE(released_at,now()),updated_at=now() WHERE id=$1",
        [
          challengeId,
          material.title,
          `Inspect the supplied ${material.file} file and identify the flag. All required information is contained in this local resource.`,
          material.category,
          material.difficulty,
          material.visibility,
          material.points,
          flagHash,
          adminId,
        ],
      );
      const challengeIndex = Number(material.id.slice(-3)) - 100;
      const resourceId = id(500 + challengeIndex);
      // Content-addressed UUID v5 keeps the download route's UUID-only path
      // validation intact while preserving old attachments on fixture updates.
      const resourceHash = createHash("sha1")
        .update(Buffer.from(resourceId.replaceAll("-", ""), "hex"))
        .update(material.content)
        .digest();
      resourceHash[6] = (resourceHash[6]! & 0x0f) | 0x50;
      resourceHash[8] = (resourceHash[8]! & 0x3f) | 0x80;
      const hex = resourceHash.subarray(0, 16).toString("hex");
      const storageName = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      await writeFile(join(uploads, storageName), material.content, {
        mode: 0o600,
        flag: "wx",
      }).catch((error) => {
        if (error.code !== "EEXIST") throw error;
      });
      await manager.query(
        "INSERT INTO resources(id,challenge_id,label,filename,storage_name,size) VALUES($1::uuid,$2,$3,$4,$6,$5) ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label,filename=EXCLUDED.filename,storage_name=EXCLUDED.storage_name,size=EXCLUDED.size",
        [
          resourceId,
          challengeId,
          material.file,
          material.file,
          Buffer.byteLength(material.content),
          storageName,
        ],
      );
      await manager.query(
        "INSERT INTO hints(id,challenge_id,position,content,cost) VALUES($1,$2,0,$3,10) ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content",
        [id(600 + challengeIndex), challengeId, material.hint],
      );
    }
    for (const [index, status] of (
      ["draft", "pending", "rejected"] as const
    ).entries()) {
      if (samplesOnly) continue;
      await manager
        .createQueryBuilder()
        .insert()
        .into(ChallengeEntity)
        .values({
          id: id(150 + index),
          title: ["Archive recovery", "Metadata trail", "Message fragments"][
            index
          ]!,
          description:
            "Inspect the supplied information and reconstruct the flag from the task description.",
          category: "forensics",
          difficulty: "medium",
          authorId: id(2),
          status,
          visibility: "event_only",
          basePoints: 200,
          flagHash: await hashSecret("flagarena{sample}"),
          connectionInfo: "",
          rejectionReason:
            status === "rejected"
              ? "Add a reproducible resource before resubmitting."
              : null,
        })
        .orIgnore()
        .execute();
    }
    const now = Date.now();
    await manager
      .createQueryBuilder()
      .insert()
      .into(EventEntity)
      .values({
        id: id(200),
        title: "Local demonstration CTF",
        description:
          "A local CTF using small text files. No external challenge service is required.",
        rules: "Individual participation. Do not share flags during the event.",
        startsAt: new Date(now - 3600000),
        endsAt: new Date(now + 86400000),
        status: "scheduled",
        access: "open",
        dynamicScoring: true,
      })
      .orIgnore()
      .execute();
    await manager
      .createQueryBuilder()
      .insert()
      .into(EventEntity)
      .values({
        id: id(201),
        title: "Club qualifier",
        description: "An upcoming invite-only event with fixed scoring.",
        rules: "Individual participation.",
        startsAt: new Date(now + 172800000),
        endsAt: new Date(now + 176400000),
        status: "scheduled",
        access: "invite_only",
        joinCodeHash: await hashSecret("college-demo"),
        dynamicScoring: false,
      })
      .orIgnore()
      .execute();
    for (let i = 0; i < 3; i++)
      await manager.query(
        "INSERT INTO event_challenges(event_id,challenge_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [id(200), id(100 + i)],
      );
    await manager.query(
      "INSERT INTO event_challenges(event_id,challenge_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [id(201), id(102)],
    );
    if (!samplesOnly) {
      await manager
        .createQueryBuilder()
        .insert()
        .into(EventEntity)
        .values({
          id: id(202),
          title: "August afterglow",
          description: "A completed community event with archived standings.",
          rules:
            "Individual participation. Results are archived after the event ends.",
          startsAt: new Date(now - 14 * 86400000),
          endsAt: new Date(now - 13 * 86400000),
          status: "archived",
          access: "open",
          dynamicScoring: false,
        })
        .orIgnore()
        .execute();
      for (const challengeIndex of [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]) {
        await manager.query(
          "INSERT INTO event_challenges(event_id,challenge_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [id(202), id(100 + challengeIndex)],
        );
      }
      for (const challengeIndex of [20, 21, 22, 23, 24, 25]) {
        await manager.query(
          "INSERT INTO event_challenges(event_id,challenge_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [id(200), id(100 + challengeIndex)],
        );
      }
      for (const challengeIndex of [
        26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
      ]) {
        await manager.query(
          "INSERT INTO event_challenges(event_id,challenge_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [id(201), id(100 + challengeIndex)],
        );
      }
    }
    if (samplesOnly) return;
    await manager.query(
      "INSERT INTO registrations(user_id,event_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [id(3), id(200)],
    );
    await manager.query(
      "INSERT INTO submissions(id,user_id,challenge_id,result) VALUES($1,$2,$3,'correct') ON CONFLICT DO NOTHING",
      [id(700), id(3), id(100)],
    );
    await manager.query(
      "INSERT INTO hint_unlocks(user_id,hint_id,cost) VALUES($1,$2,10) ON CONFLICT DO NOTHING",
      [id(3), id(600)],
    );
    await manager.query(
      "INSERT INTO solves(id,submission_id,user_id,challenge_id,context_key,points,original_points) VALUES($1,$2,$3,$4,'practice',90,90) ON CONFLICT DO NOTHING",
      [id(800), id(700), id(3), id(100)],
    );
    await manager.query(
      "INSERT INTO reviews(id,user_id,challenge_id,rating,comment) VALUES($1,$2,$3,4,$4) ON CONFLICT DO NOTHING",
      [
        id(900),
        id(3),
        id(100),
        "The resource is sufficient to reproduce the answer.",
      ],
    );
    const practiceChallenges = [
      100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
    ];
    for (let playerIndex = 0; playerIndex < 12; playerIndex++) {
      const userId = id(3 + playerIndex);
      for (const [solveIndex, challengeIndex] of practiceChallenges.entries()) {
        if ((playerIndex + solveIndex) % 4 > 1) continue;
        const submissionId = id(1000 + playerIndex * 20 + solveIndex);
        const solveId = id(2000 + playerIndex * 20 + solveIndex);
        await manager.query(
          "INSERT INTO submissions(id,user_id,challenge_id,result,created_at) VALUES($1,$2,$3,'correct',$4) ON CONFLICT DO NOTHING",
          [
            submissionId,
            userId,
            id(challengeIndex),
            new Date(now - (playerIndex + solveIndex + 1) * 86400000),
          ],
        );
        await manager.query(
          "INSERT INTO solves(id,submission_id,user_id,challenge_id,context_key,points,original_points,created_at) VALUES($1,$2,$3,$4,'practice',$5,$5,$6) ON CONFLICT DO NOTHING",
          [
            solveId,
            submissionId,
            userId,
            id(challengeIndex),
            seededChallenges[challengeIndex - 100]?.points ?? 100,
            new Date(now - (playerIndex + solveIndex + 1) * 86400000),
          ],
        );
      }
    }
    const [archivedEvent] = await manager.query(
      "SELECT starts_at FROM events WHERE id=$1",
      [id(202)],
    );
    const archivedStart = new Date(archivedEvent.starts_at).getTime();
    for (let playerIndex = 0; playerIndex < 10; playerIndex++) {
      const userId = id(3 + playerIndex);
      await manager.query(
        "INSERT INTO registrations(user_id,event_id,joined_at,attended_at) VALUES($1,$2,$3,$3) ON CONFLICT (user_id,event_id) DO UPDATE SET joined_at=EXCLUDED.joined_at,attended_at=EXCLUDED.attended_at",
        [userId, id(202), new Date(archivedStart)],
      );
      for (
        let solveIndex = 0;
        solveIndex < 1 + (playerIndex % 3);
        solveIndex++
      ) {
        const challengeIndex = 20 + ((playerIndex + solveIndex) % 10);
        const submissionId = id(3000 + playerIndex * 10 + solveIndex);
        const solveId = id(4000 + playerIndex * 10 + solveIndex);
        const points = seededChallenges[challengeIndex]?.points ?? 100;
        await manager.query(
          "INSERT INTO submissions(id,user_id,challenge_id,event_id,result,created_at) VALUES($1,$2,$3,$4,'correct',$5) ON CONFLICT (id) DO UPDATE SET created_at=EXCLUDED.created_at",
          [
            submissionId,
            userId,
            id(100 + challengeIndex),
            id(202),
            new Date(archivedStart + (playerIndex + solveIndex + 1) * 3600000),
          ],
        );
        await manager.query(
          "INSERT INTO solves(id,submission_id,user_id,challenge_id,event_id,context_key,points,original_points,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$7,$8) ON CONFLICT (id) DO UPDATE SET created_at=EXCLUDED.created_at",
          [
            solveId,
            submissionId,
            userId,
            id(100 + challengeIndex),
            id(202),
            id(202),
            points,
            new Date(archivedStart + (playerIndex + solveIndex + 1) * 3600000),
          ],
        );
      }
    }
  });
  console.info("Demo seed ready. Account details are in docs/development.md.");
} finally {
  await db.destroy();
}
