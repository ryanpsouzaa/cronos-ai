import { compare } from "bcryptjs";
import { User } from "../../../models/user.model.js";
import { GeneralErrorResponse } from "../../../exceptions/GeneralErrorResponse.js";
import { statusCode } from "../../../exceptions/statusCode.js";
import { ERRORS } from "../../../exceptions/errors.js";
import { logger } from "../../../logger/index.js";
import type { LoginUserInput } from "../../../schemas/onboarding/users/loginUser.js";

export async function loginUserService(input: LoginUserInput) {
  logger.info("IN - loginUserService");
  logger.debug({ email: input.email }, "IN - loginUserService :: input");

  const user = await User.findOne({ email: input.email });

  if (!user) {
    throw new GeneralErrorResponse(
      statusCode.UNAUTHORIZED,
      ERRORS.AUTH.INVALID_CREDENTIALS.message
    );
  }

  const passwordMatch = await compare(input.password, user.password);

  if (!passwordMatch) {
    throw new GeneralErrorResponse(
      statusCode.UNAUTHORIZED,
      ERRORS.AUTH.INVALID_CREDENTIALS.message
    );
  }

  const result = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
  };

  logger.debug({ id: result.id }, "OUT - loginUserService :: result");
  logger.info("OUT - loginUserService");

  return result;
}
