import type { FastifyRequest, FastifyReply } from "fastify";
import { validate } from "../../../schemas/validate.js";
import { loginUserSchema } from "../../../schemas/onboarding/users/loginUser.js";
import { loginUserService } from "../../../services/onboarding/user/loginUserService.js";
import { statusCode } from "../../../exceptions/statusCode.js";
import { logger } from "../../../logger/index.js";

export async function loginUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  logger.info("IN - loginUser");

  const input = validate(loginUserSchema, request.body);
  const user = await loginUserService(input);

  const token = await reply.jwtSign(
    { id: user.id, email: user.email },
    { expiresIn: "1d" }
  );

  logger.info("OUT - loginUser");
  reply.status(statusCode.OK).send({ token, user });
}
