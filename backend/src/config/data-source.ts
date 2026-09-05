import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import {
  UserEntity,
  ChallengeEntity,
  EventEntity,
} from "../database/entities.js";
import { InitialSchema1788580000000 } from "../database/migrations/1788580000000-InitialSchema.js";

export function createDataSource(url: string): DataSource {
  return new DataSource({
    type: "postgres",
    url,
    entities: [UserEntity, ChallengeEntity, EventEntity],
    migrations: [InitialSchema1788580000000],
    synchronize: false,
    logging: false,
    extra: { max: 10 },
  });
}
export default createDataSource(
  process.env.DATABASE_URL ?? "postgresql://localhost/flagarena",
);
