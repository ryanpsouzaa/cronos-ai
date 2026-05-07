import type { FastifyRequest, FastifyReply } from "fastify";
import { GeneralErrorResponse } from "../exceptions/GeneralErrorResponse.js";
import { statusCode } from "../exceptions/statusCode.js";
import { ERRORS } from "../exceptions/errors.js";

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw new GeneralErrorResponse(
      statusCode.UNAUTHORIZED,
      ERRORS.AUTH.INVALID_TOKEN.message
    );
  }
}
