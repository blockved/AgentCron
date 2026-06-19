import fp from "fastify-plugin";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    traceId: string;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorateRequest("traceId", "");

  fastify.addHook("onRequest", async (request) => {
    request.traceId =
      (request.headers["x-trace-id"] as string) || randomUUID();
  });

  fastify.addHook("onSend", async (request, reply) => {
    reply.header("x-trace-id", request.traceId);
  });
});
