import type { FastifyRequest, FastifyReply } from "fastify";
import { listUsersService } from "../../../services/onboarding/user/listUsersService.js";
import { statusCode } from "../../../exceptions/statusCode.js";
import { logger } from "../../../logger/index.js";

export async function listUsers(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  logger.info("IN - listUsers");

  const users = await listUsersService();

  logger.info("OUT - listUsers");
  reply.status(statusCode.OK).send(users);
}
