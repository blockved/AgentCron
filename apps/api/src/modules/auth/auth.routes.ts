import type { FastifyInstance } from "fastify";
import { loginSchema } from "./auth.schema.js";
import { AuthService } from "./auth.service.js";
import { DEFAULTS } from "@agentcron/shared";

export default async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app.prisma);

  app.post("/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const payload = await authService.validateCredentials(
      input.username,
      input.password
    );
    if (!payload) {
      return reply.status(401).send({
        code: 40100,
        data: null,
        message: "Invalid credentials",
        traceId: request.traceId,
      });
    }

    const token = app.jwt.sign(
      {
        userId: payload.userId.toString(),
        username: payload.username,
        role: payload.role,
      },
      { expiresIn: DEFAULTS.JWT_EXPIRES_IN }
    );

    return {
      code: 0,
      data: {
        token,
        user: {
          id: payload.userId.toString(),
          username: payload.username,
          role: payload.role,
        },
      },
      message: "ok",
      traceId: request.traceId,
    };
  });

  app.post("/logout", { preHandler: [app.authenticate] }, async (request) => {
    return {
      code: 0,
      data: null,
      message: "ok",
      traceId: request.traceId,
    };
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (request) => {
    const user = await authService.getUserById(
      BigInt(request.currentUser.userId as unknown as string)
    );
    if (!user) {
      return { code: 40400, data: null, message: "User not found", traceId: request.traceId };
    }
    return {
      code: 0,
      data: {
        id: user.id.toString(),
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      },
      message: "ok",
      traceId: request.traceId,
    };
  });
}
