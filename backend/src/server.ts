import { readConfig } from "./config/env.js";
import { createDataSource } from "./config/data-source.js";
import { createApp } from "./app.js";

const config = readConfig();
const db = createDataSource(config.DATABASE_URL);
try {
  await db.initialize();
} catch {
  console.error(
    "Database connection failed. Check the backend configuration and database availability.",
  );
  process.exit(1);
}
const server = createApp(db, config).listen(config.PORT, config.HOST, () =>
  console.info(`FlagArena API listening on ${config.HOST}:${config.PORT}`),
);
const shutdown = () =>
  server.close(() => {
    void db.destroy().finally(() => process.exit(0));
  });
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
