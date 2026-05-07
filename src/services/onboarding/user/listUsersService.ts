import { User } from "../../../models/user.model.js";
import { logger } from "../../../logger/index.js";

export async function listUsersService() {
  logger.info("IN - listUsersService");

  const users = await User.find().select("-password").sort({ createdAt: -1 });

  logger.debug({ count: users.length }, "OUT - listUsersService :: result");
  logger.info("OUT - listUsersService");

  return users;
}
