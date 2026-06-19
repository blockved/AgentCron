import { buildApp } from "../../../apps/api/src/index.js";
import type { FastifyInstance } from "fastify";

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.ready();
  return app;
}

export function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}
