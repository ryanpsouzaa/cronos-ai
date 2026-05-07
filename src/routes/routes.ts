import type { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/authenticate.js";
import { createUser } from "../controller/onboarding/user/createUser.js";
import { loginUser } from "../controller/onboarding/user/loginUser.js";
import { listUsers } from "../controller/onboarding/user/listUsers.js";
import { getUserById } from "../controller/onboarding/user/getUserById.js";
import { updateUser } from "../controller/onboarding/user/updateUser.js";
import { deleteUser } from "../controller/onboarding/user/deleteUser.js";

export async function appRoutes(app: FastifyInstance): Promise<void> {
  // Public
  app.post("/onboarding/users", createUser);
  app.post("/onboarding/users/login", loginUser);

  // Protected
  app.get("/onboarding/users", { preHandler: authenticate }, listUsers);
  app.get("/onboarding/users/:id", { preHandler: authenticate }, getUserById);
  app.patch("/onboarding/users/:id", { preHandler: authenticate }, updateUser);
  app.delete("/onboarding/users/:id", { preHandler: authenticate }, deleteUser);
}
