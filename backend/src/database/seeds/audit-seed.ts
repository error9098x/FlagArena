import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { z } from "zod";
import db from "../../config/data-source.js";
import { compareSecret } from "../../auth/secrets.js";
import { seededChallenges } from "./challenge-manifest.js";

// Read-only verification of the reserved fixture catalog in a seeded database.
const uploads = resolve(process.env.UPLOAD_DIR ?? "../var/uploads");
const failures: string[] = [];
await db.initialize();
try {
  for (const challenge of seededChallenges) {
    const [row] = await db.query(
      "SELECT c.flag_hash,c.visibility,c.status,r.storage_name,r.filename,r.size FROM challenges c JOIN resources r ON r.challenge_id=c.id WHERE c.id=$1 AND r.id=$2",
      [
        challenge.id,
        challenge.id.slice(0, -3) +
          String(500 + Number(challenge.id.slice(-3)) - 100),
      ],
    );
    if (!row) {
      failures.push(`${challenge.title}: missing challenge/resource`);
      continue;
    }
    try {
      const file = await readFile(
        join(uploads, z.uuid().parse(row.storage_name)),
      );
      if (
        file.toString() !== challenge.content ||
        file.length !== Number(row.size) ||
        row.filename !== challenge.file
      )
        failures.push(`${challenge.title}: attachment differs from manifest`);
      if (!(await compareSecret(challenge.flag, row.flag_hash)))
        failures.push(`${challenge.title}: saved answer mismatch`);
      if (row.visibility !== challenge.visibility || row.status !== "approved")
        failures.push(`${challenge.title}: publication metadata mismatch`);
    } catch {
      failures.push(`${challenge.title}: invalid or unreadable attachment`);
    }
  }
  const [{ count: outside }] = await db.query(
    "SELECT count(*) FROM solves s JOIN events e ON e.id=s.event_id WHERE e.id='10000000-0000-4000-8000-000000000202' AND (s.created_at<e.starts_at OR s.created_at>=e.ends_at)",
  );
  if (Number(outside))
    failures.push(`${outside} archived-event solves outside event window`);
  const [{ count: unassigned }] = await db.query(
    "SELECT count(*) FROM challenges c WHERE c.id=ANY($1::uuid[]) AND c.visibility='event_only' AND NOT EXISTS(SELECT 1 FROM event_challenges ec WHERE ec.challenge_id=c.id)",
    [seededChallenges.map((c) => c.id)],
  );
  if (Number(unassigned))
    failures.push(`${unassigned} event-only challenges without an event`);
  if (failures.length) throw new Error(failures.join("\n"));
  console.info(
    "Seed audit passed: 40 downloadable files match metadata and hashed answers; 20 public/20 event-only; all event-only challenges assigned; archived solve times valid.",
  );
} finally {
  await db.destroy();
}
