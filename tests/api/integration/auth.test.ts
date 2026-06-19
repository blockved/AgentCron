/**
 * Integration tests for auth module.
 * These tests require a running MySQL instance and are skipped in CI unit test runs.
 * Run with: pnpm --filter @agentcron/api test (with DATABASE_URL configured)
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestApp, authHeader } from "../helpers/setup.js";
import type { FastifyInstance } from "fastify";

describe.skip("Auth Integration (requires MySQL)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /api/auth/login — returns token for valid credentials", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      body: { username: "admin", password: "password" },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.code).toBe(0);
    expect(body.data.token).toBeDefined();
  });

  it("POST /api/auth/login — returns 401 for invalid credentials", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      body: { username: "admin", password: "wrong" },
    });
    expect(response.statusCode).toBe(401);
  });

  it("POST /api/auth/logout — returns 200 for authenticated user", async () => {
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      body: { username: "admin", password: "password" },
    });
    const { token } = loginRes.json().data;

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: authHeader(token),
    });
    expect(response.statusCode).toBe(200);
  });

  it("GET /api/auth/me — returns user info for authenticated user", async () => {
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      body: { username: "admin", password: "password" },
    });
    const { token } = loginRes.json().data;

    const response = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: authHeader(token),
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.username).toBe("admin");
  });
});
