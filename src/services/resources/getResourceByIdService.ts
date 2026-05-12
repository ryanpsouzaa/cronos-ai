import mongoose from "mongoose";
import { Resource } from "../../models/resource.model.js";
import { GeneralErrorResponse } from "../../exceptions/GeneralErrorResponse.js";
import { statusCode } from "../../exceptions/statusCode.js";
import { ERRORS } from "../../exceptions/errors.js";
import { logger } from "../../logger/index.js";

export async function getResourceByIdService(resourceId: string, userId: string) {
  logger.info({ resourceId }, "IN - getResourceByIdService");

  if (!mongoose.isValidObjectId(resourceId)) {
    throw new GeneralErrorResponse(statusCode.BAD_REQUEST, ERRORS.RESOURCE.INVALID_ID.message);
  }

  const resource = await Resource.findOne({ _id: resourceId, userId }).lean();

  if (!resource) {
    throw new GeneralErrorResponse(statusCode.NOT_FOUND, ERRORS.RESOURCE.NOT_FOUND.message);
  }

  const result = {
    id: resource._id,
    originalName: resource.originalName,
    mimeType: resource.mimeType,
    size: resource.size,
    status: resource.status,
    errorMessage: resource.errorMessage,
    vectorCount: resource.vectorCount,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  };

  logger.info({ resourceId }, "OUT - getResourceByIdService");
  return result;
}
