import type { FastifyRequest, FastifyReply } from "fastify";
import { validate } from "../../schemas/validate.js";
import { resourceParamsSchema } from "../../schemas/resources/resourceParams.js";
import { getResourceByIdService } from "../../services/resources/getResourceByIdService.js";
import { statusCode } from "../../exceptions/statusCode.js";
import { logger } from "../../logger/index.js";

export async function getResourceById(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  logger.info("IN - getResourceById");

  const { id } = validate(resourceParamsSchema, request.params);
  const resource = await getResourceByIdService(id, request.user.id);

  logger.info("OUT - getResourceById");
  reply.status(statusCode.OK).send({ resource });
}
