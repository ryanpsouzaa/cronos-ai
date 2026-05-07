import type { FastifyRequest, FastifyReply } from "fastify";
import { validate } from "../../../schemas/validate.js";
import { userParamsSchema } from "../../../schemas/onboarding/users/userParams.js";
import { deleteUserService } from "../../../services/onboarding/user/deleteUserService.js";
import { statusCode } from "../../../exceptions/statusCode.js";
import { logger } from "../../../logger/index.js";

export async function deleteUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  logger.info("IN - deleteUser");

  const { id } = validate(userParamsSchema, request.params);
  await deleteUserService(id);

  logger.info("OUT - deleteUser");
  reply.status(statusCode.NO_CONTENT).send();
}
