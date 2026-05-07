import type { FastifyRequest, FastifyReply } from "fastify";
import { validate } from "../../../schemas/validate.js";
import { userParamsSchema } from "../../../schemas/onboarding/users/userParams.js";
import { getUserByIdService } from "../../../services/onboarding/user/getUserByIdService.js";
import { statusCode } from "../../../exceptions/statusCode.js";
import { logger } from "../../../logger/index.js";

export async function getUserById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  logger.info("IN - getUserById");

  const { id } = validate(userParamsSchema, request.params);
  const user = await getUserByIdService(id);

  logger.info("OUT - getUserById");
  reply.status(statusCode.OK).send(user);
}
