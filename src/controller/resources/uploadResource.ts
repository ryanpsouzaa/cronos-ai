import type { FastifyRequest, FastifyReply } from "fastify";
import { uploadResourceService } from "../../services/resources/uploadResourceService.js";
import { GeneralErrorResponse } from "../../exceptions/GeneralErrorResponse.js";
import { statusCode } from "../../exceptions/statusCode.js";
import { ERRORS } from "../../exceptions/errors.js";
import { logger } from "../../logger/index.js";

export async function uploadResource(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info("IN - uploadResource");

  try {
    const data = await request.file();

    if (!data) {
      throw new GeneralErrorResponse(
        statusCode.BAD_REQUEST,
        ERRORS.RESOURCE.NO_FILE.message,
      );
    }

    if (data.mimetype !== "application/pdf") {
      throw new GeneralErrorResponse(
        statusCode.BAD_REQUEST,
        ERRORS.RESOURCE.INVALID_FILE_TYPE.message,
      );
    }

    const buffer = await data.toBuffer();

    const resource = await uploadResourceService({
      userId: request.user.id,
      originalName: data.filename,
      mimeType: data.mimetype,
      buffer,
    });

    logger.info("OUT - uploadResource");
    reply.status(statusCode.CREATED).send({ resource });
  } catch (err) {
    console.log(err);
  }
}
