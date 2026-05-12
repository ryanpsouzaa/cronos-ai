import fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { logger } from "./logger/index.js";
import { env } from "./env/index.js";
import { GeneralErrorResponse } from "./exceptions/GeneralErrorResponse.js";
import { statusCode } from "./exceptions/statusCode.js";
import { ERRORS } from "./exceptions/errors.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { id: string; email: string };
    user: { id: string; email: string };
  }
}

export const app = fastify({ loggerInstance: logger });

app.register(fastifyJwt, { secret: env.JWT_SECRET });
app.register(multipart, {
  limits: { fileSize: 20 * 1024 * 1024 },
});

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof GeneralErrorResponse) {
    const response: Record<string, unknown> = { error: error.message };
    if (error.details !== undefined) {
      response["details"] = error.details;
    }
    reply.status(error.statusCode).send(response);
    return;
  }

  reply.status(statusCode.INTERNAL_SERVER_ERROR).send({
    error: ERRORS.GENERAL.INTERNAL_SERVER_ERROR.message,
  });
});
