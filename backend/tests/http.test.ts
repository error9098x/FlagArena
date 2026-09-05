import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { DataSource } from "typeorm";
import { createApp } from "../src/app.js";
import type { Config } from "../src/config/env.js";

let server: Server;
let url: string;
const config: Config = {
  NODE_ENV: "test",
  PORT: 4000,
  HOST: "127.0.0.1",
  APP_URL: "http://localhost:5173",
  DATABASE_URL: "not-connected",
  JWT_SECRET: "test-secret-not-for-production-00000000",
  MAIL_MODE: "file",
  MAIL_DIR: "/tmp/flagarena-test-mail",
  UPLOAD_DIR: "/tmp/flagarena-test-uploads",
  RESEND_FROM_EMAIL: "test@example.test",
  TRUST_PROXY: "0",
};
beforeAll(async () => {
  const db = {
    query: async () => {
      throw new Error("Private database connection string");
    },
  } as unknown as DataSource;
  server = createApp(db, config).listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  if (server?.listening)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
});
describe("HTTP boundaries without a database", () => {
  it("provides liveness and explicit readiness failure", async () => {
    expect(await (await fetch(`${url}/api/health`)).json()).toEqual({
      status: "ok",
    });
    const response = await fetch(`${url}/api/ready`);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "database_unavailable" });
  });
  it("rejects unauthenticated requests before persistence access", async () => {
    for (const path of [
      "/challenges",
      "/events",
      "/admin/users",
      "/dashboard",
      "/resources/00000000-0000-4000-8000-000000000001/download",
    ]) {
      const response = await fetch(`${url}/api${path}`);
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        code: "UNAUTHENTICATED",
        message: "Log in to use this action",
      });
    }
  });
  it("rejects a cross-origin cookie action", async () => {
    const response = await fetch(`${url}/api/auth/logout`, {
      method: "POST",
      headers: { Origin: "https://untrusted.example" },
    });
    expect(response.status).toBe(403);
  });
  it("validates malformed registration and sets security headers", async () => {
    const response = await fetch(`${url}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION" });
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.has("x-powered-by")).toBe(false);
  });
});
