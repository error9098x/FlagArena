import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { registerSchema } from "@flagarena/shared";
import db from "../config/data-source.js";
import { UserEntity } from "./entities.js";
import { audit } from "./audit.js";

const input = registerSchema.parse({
  username: process.env.ADMIN_NAME,
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
});
await db.initialize();
try {
  await db.transaction(async (manager) => {
    await manager.query("SELECT pg_advisory_xact_lock(83142)");
    if (await manager.getRepository(UserEntity).countBy({ role: "admin" }))
      throw new Error(
        "An Admin already exists. Use the application to add another.",
      );
    const id = randomUUID();
    await manager.getRepository(UserEntity).insert({
      id,
      username: input.username,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 12),
      role: "admin",
      isVerified: true,
    });
    await audit(manager, null, "admin.bootstrapped", id);
  });
  console.info("Initial Admin created");
} finally {
  await db.destroy();
}
