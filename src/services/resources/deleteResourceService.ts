import mongoose from "mongoose";
import { Resource } from "../../models/resource.model.js";
import { minioClient } from "../../infra/minio.js";
import { qdrantClient } from "../../infra/qdrant.js";
import { GeneralErrorResponse } from "../../exceptions/GeneralErrorResponse.js";
import { statusCode } from "../../exceptions/statusCode.js";
import { ERRORS } from "../../exceptions/errors.js";
import { env } from "../../env/index.js";
import { logger } from "../../logger/index.js";

export async function deleteResourceService(resourceId: string, userId: string): Promise<void> {
  logger.info({ resourceId }, "IN - deleteResourceService");

  if (!mongoose.isValidObjectId(resourceId)) {
    throw new GeneralErrorResponse(statusCode.BAD_REQUEST, ERRORS.RESOURCE.INVALID_ID.message);
  }

  const resource = await Resource.findOne({ _id: resourceId, userId });

  if (!resource) {
    throw new GeneralErrorResponse(statusCode.NOT_FOUND, ERRORS.RESOURCE.NOT_FOUND.message);
  }

  if (resource.minioKey) {
    await minioClient.removeObject(env.MINIO_BUCKET, resource.minioKey);
  }

  if (resource.status === "done") {
    await qdrantClient.delete(env.QDRANT_COLLECTION, {
      filter: {
        must: [
          { key: "resourceId", match: { value: resourceId } },
          { key: "userId", match: { value: userId } },
        ],
      },
    });
  }

  await Resource.findByIdAndDelete(resourceId);

  logger.info({ resourceId }, "OUT - deleteResourceService");
}
