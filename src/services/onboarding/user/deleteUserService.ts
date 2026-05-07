import mongoose from "mongoose";
import { User } from "../../../models/user.model.js";
import { GeneralErrorResponse } from "../../../exceptions/GeneralErrorResponse.js";
import { statusCode } from "../../../exceptions/statusCode.js";
import { ERRORS } from "../../../exceptions/errors.js";
import { logger } from "../../../logger/index.js";

export async function deleteUserService(id: string): Promise<void> {
  logger.info("IN - deleteUserService");
  logger.debug({ id }, "IN - deleteUserService :: input");

  if (!mongoose.isValidObjectId(id)) {
    throw new GeneralErrorResponse(statusCode.BAD_REQUEST, ERRORS.USER.INVALID_ID.message);
  }

  const user = await User.findByIdAndDelete(id);

  if (!user) {
    throw new GeneralErrorResponse(statusCode.NOT_FOUND, ERRORS.USER.NOT_FOUND.message);
  }

  logger.info("OUT - deleteUserService");
}
