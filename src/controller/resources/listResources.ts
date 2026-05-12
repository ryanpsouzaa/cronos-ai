import type { FastifyRequest, FastifyReply } from "fastify";
import { listResourcesService } from "../../services/resources/listResourcesService.js";
import { statusCode } from "../../exceptions/statusCode.js";
import { logger } from "../../logger/index.js";

export async function listResources(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  logger.info("IN - listResources");

  const resources = await listResourcesService(request.user.id);

  logger.info("OUT - listResources");
  reply.status(statusCode.OK).send({ resources });
}
