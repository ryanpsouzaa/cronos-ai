import type { FastifyRequest, FastifyReply } from "fastify";
import { validate } from "../../../schemas/validate.js";
import { createUserSchema } from "../../../schemas/onboarding/users/createUser.js";
import { createUserService } from "../../../services/onboarding/user/createUserService.js";
import { statusCode } from "../../../exceptions/statusCode.js";
import { logger } from "../../../logger/index.js";

export async function createUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  logger.info("IN - createUser");

  const input = validate(createUserSchema, request.body);
  const user = await createUserService(input);

  const token = await reply.jwtSign(
    { id: user.id.toString(), email: user.email },
    { expiresIn: "1d" }
  );

  logger.info("OUT - createUser");
  reply.status(statusCode.CREATED).send({ token, user });
}
