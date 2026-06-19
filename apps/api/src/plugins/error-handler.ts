import fp from "fastify-plugin";
import type { FastifyInstance, FastifyError } from "fastify";
import { log } from "../logger.js";

export default fp(async (fastify: FastifyInstance) => {
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    const traceId = request.traceId || "unknown";
    const statusCode = error.statusCode || 500;
    const code = statusCode >= 500 ? 50000 : statusCode * 100;

    if (statusCode >= 500) {
      log("error", "http", error.message, { stack: error.stack }, traceId);
    }

    reply.status(statusCode).send({
      code,
      data: null,
      message: statusCode >= 500 ? "Internal Server Error" : error.message,
      traceId,
    });
  });
});
