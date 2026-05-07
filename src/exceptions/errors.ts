export const ERRORS = {
  GENERAL: {
    VALIDATION_ERROR: { message: "Validation error" },
    INVALID_PARAMS: { message: "Invalid params" },
    INTERNAL_SERVER_ERROR: { message: "Internal server error" },
  },
  AUTH: {
    INVALID_CREDENTIALS: { message: "Invalid credentials" },
    INVALID_TOKEN: { message: "Invalid or expired token" },
    UNAUTHORIZED: { message: "Unauthorized" },
  },
  USER: {
    NOT_FOUND: { message: "User not found" },
    EMAIL_ALREADY_IN_USE: { message: "Email already in use" },
    INVALID_ID: { message: "Invalid user ID" },
    AT_LEAST_ONE_FIELD_REQUIRED: { message: "At least one field must be provided" },
  },
} as const;
