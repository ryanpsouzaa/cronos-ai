import type { FastifyRequest, FastifyReply } from "fastify";
import { validate } from "../../schemas/validate.js";
import { resourceParamsSchema } from "../../schemas/resources/resourceParams.js";
import { deleteResourceService } from "../../services/resources/deleteResourceService.js";
import { statusCode } from "../../exceptions/statusCode.js";
import { logger } from "../../logger/index.js";

export async function deleteResource(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  logger.info("IN - deleteResource");

  const { id } = validate(resourceParamsSchema, request.params);
  await deleteResourceService(id, request.user.id);

  logger.info("OUT - deleteResource");
  reply.status(statusCode.NO_CONTENT).send();
}
