import mongoose from "mongoose";
import { hash } from "bcryptjs";
import { User } from "../../../models/user.model.js";
import { GeneralErrorResponse } from "../../../exceptions/GeneralErrorResponse.js";
import { statusCode } from "../../../exceptions/statusCode.js";
import { ERRORS } from "../../../exceptions/errors.js";
import { logger } from "../../../logger/index.js";
import type { CreateUserInput } from "../../../schemas/onboarding/users/createUser.js";

export async function createUserService(input: CreateUserInput) {
  logger.info("IN - createUserService");
  logger.debug({ name: input.name, email: input.email }, "IN - createUserService :: input");

  try {
    const hashedPassword = await hash(input.password, 10);
    const user = await User.create({
      name: input.name,
      email: input.email,
      password: hashedPassword,
    });

    const result = {
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };

    logger.debug({ result }, "OUT - createUserService :: result");
    logger.info("OUT - createUserService");

    return result;
  } catch (err) {
    if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
      throw new GeneralErrorResponse(
        statusCode.CONFLICT,
        ERRORS.USER.EMAIL_ALREADY_IN_USE.message
      );
    }
    throw err;
  }
}
