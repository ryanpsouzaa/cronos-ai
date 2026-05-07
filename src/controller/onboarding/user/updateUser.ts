import type { FastifyRequest, FastifyReply } from "fastify";
import { validate } from "../../../schemas/validate.js";
import { userParamsSchema } from "../../../schemas/onboarding/users/userParams.js";
import { updateUserSchema } from "../../../schemas/onboarding/users/updateUser.js";
import { updateUserService } from "../../../services/onboarding/user/updateUserService.js";
import { statusCode } from "../../../exceptions/statusCode.js";
import { logger } from "../../../logger/index.js";

export async function updateUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  logger.info("IN - updateUser");

  const { id } = validate(userParamsSchema, request.params);
  const input = validate(updateUserSchema, request.body);
  const user = await updateUserService(id, input);

  logger.info("OUT - updateUser");
  reply.status(statusCode.OK).send(user);
}
