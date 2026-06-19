import fp from "fastify-plugin";
import fjwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { JwtPayload } from "@agentcron/shared";

declare module "fastify" {
  interface FastifyRequest {
    currentUser: JwtPayload;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(fjwt, {
    secret: (fastify as any).config.jwtSecret,
  });

  fastify.decorateRequest<JwtPayload | null>("currentUser", null);

  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest) => {
      await request.jwtVerify();
      request.currentUser = request.user;
    }
  );

  fastify.decorate(
    "requireAdmin",
    async (request: FastifyRequest) => {
      await request.jwtVerify();
      request.currentUser = request.user;
      if (request.currentUser.role !== "admin") {
        const err = new Error("Admin access required") as any;
        err.statusCode = 403;
        throw err;
      }
    }
  );
});

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
    requireAdmin: (request: FastifyRequest) => Promise<void>;
    config: import("../config.js").AppConfig;
  }
}
