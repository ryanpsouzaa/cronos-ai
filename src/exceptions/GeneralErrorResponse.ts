import type { StatusCode } from "./statusCode.js";

export class GeneralErrorResponse extends Error {
  public readonly statusCode: StatusCode;
  public readonly details?: unknown;

  constructor(statusCode: StatusCode, message: string, details?: unknown) {
    super(message);
    this.name = "GeneralErrorResponse";
    this.statusCode = statusCode;
    this.details = details;
  }
}
