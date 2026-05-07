import mongoose from "mongoose";
import { User } from "../../../models/user.model.js";
import { GeneralErrorResponse } from "../../../exceptions/GeneralErrorResponse.js";
import { statusCode } from "../../../exceptions/statusCode.js";
import { ERRORS } from "../../../exceptions/errors.js";
import { logger } from "../../../logger/index.js";

export async function getUserByIdService(id: string) {
  logger.info("IN - getUserByIdService");
  logger.debug({ id }, "IN - getUserByIdService :: input");

  if (!mongoose.isValidObjectId(id)) {
    throw new GeneralErrorResponse(statusCode.BAD_REQUEST, ERRORS.USER.INVALID_ID.message);
  }

  const user = await User.findById(id).select("-password");

  if (!user) {
    throw new GeneralErrorResponse(statusCode.NOT_FOUND, ERRORS.USER.NOT_FOUND.message);
  }

  logger.debug({ id: user._id }, "OUT - getUserByIdService :: result");
  logger.info("OUT - getUserByIdService");

  return user;
}
