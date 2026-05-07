import mongoose from "mongoose";
import { hash } from "bcryptjs";
import { User } from "../../../models/user.model.js";
import { GeneralErrorResponse } from "../../../exceptions/GeneralErrorResponse.js";
import { statusCode } from "../../../exceptions/statusCode.js";
import { ERRORS } from "../../../exceptions/errors.js";
import { logger } from "../../../logger/index.js";
import type { UpdateUserInput } from "../../../schemas/onboarding/users/updateUser.js";

export async function updateUserService(id: string, input: UpdateUserInput) {
  logger.info("IN - updateUserService");
  logger.debug(
    { id, name: input.name, email: input.email, passwordProvided: !!input.password },
    "IN - updateUserService :: input"
  );

  if (!mongoose.isValidObjectId(id)) {
    throw new GeneralErrorResponse(statusCode.BAD_REQUEST, ERRORS.USER.INVALID_ID.message);
  }

  const { name, email, password } = input;

  if (!name && !email && !password) {
    throw new GeneralErrorResponse(
      statusCode.BAD_REQUEST,
      ERRORS.USER.AT_LEAST_ONE_FIELD_REQUIRED.message
    );
  }

  const updates: Record<string, unknown> = {};
  if (name) updates["name"] = name;
  if (email) updates["email"] = email;
  if (password) updates["password"] = await hash(password, 10);

  try {
    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select("-password");

    if (!user) {
      throw new GeneralErrorResponse(statusCode.NOT_FOUND, ERRORS.USER.NOT_FOUND.message);
    }

    logger.debug({ id: user._id }, "OUT - updateUserService :: result");
    logger.info("OUT - updateUserService");

    return user;
  } catch (err) {
    if (err instanceof GeneralErrorResponse) throw err;
    if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
      throw new GeneralErrorResponse(
        statusCode.CONFLICT,
        ERRORS.USER.EMAIL_ALREADY_IN_USE.message
      );
    }
    throw err;
  }
}
