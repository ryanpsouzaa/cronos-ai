import { z, type ZodType } from "zod";
import { GeneralErrorResponse } from "../exceptions/GeneralErrorResponse.js";
import { statusCode } from "../exceptions/statusCode.js";
import { ERRORS } from "../exceptions/errors.js";

export function validate<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new GeneralErrorResponse(
      statusCode.BAD_REQUEST,
      ERRORS.GENERAL.VALIDATION_ERROR.message,
      z.treeifyError(result.error)
    );
  }

  return result.data;
}
