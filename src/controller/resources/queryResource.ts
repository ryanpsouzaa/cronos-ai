import type { FastifyRequest, FastifyReply } from "fastify";
import { validate } from "../../schemas/validate.js";
import { resourceParamsSchema } from "../../schemas/resources/resourceParams.js";
import { queryResourceSchema } from "../../schemas/resources/queryResource.js";
import { queryResourceService } from "../../services/resources/queryResourceService.js";
import { statusCode } from "../../exceptions/statusCode.js";
import { logger } from "../../logger/index.js";

export async function queryResource(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  logger.info("IN - queryResource");

  const { id } = validate(resourceParamsSchema, request.params);
  const { question } = validate(queryResourceSchema, request.body);

  const result = await queryResourceService({
    question,
    userId: request.user.id,
    resourceId: id,
  });

  logger.info("OUT - queryResource");
  reply.status(statusCode.OK).send(result);
}

export async function queryAllResources(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  logger.info("IN - queryAllResources");

  const { question } = validate(queryResourceSchema, request.body);

  const result = await queryResourceService({
    question,
    userId: request.user.id,
  });

  logger.info("OUT - queryAllResources");
  reply.status(statusCode.OK).send(result);
}
