import type { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/authenticate.js";
import { createUser } from "../controller/onboarding/user/createUser.js";
import { loginUser } from "../controller/onboarding/user/loginUser.js";
import { listUsers } from "../controller/onboarding/user/listUsers.js";
import { getUserById } from "../controller/onboarding/user/getUserById.js";
import { updateUser } from "../controller/onboarding/user/updateUser.js";
import { deleteUser } from "../controller/onboarding/user/deleteUser.js";
import { uploadResource } from "../controller/resources/uploadResource.js";
import { listResources } from "../controller/resources/listResources.js";
import { getResourceById } from "../controller/resources/getResourceById.js";
import { deleteResource } from "../controller/resources/deleteResource.js";
import { queryResource, queryAllResources } from "../controller/resources/queryResource.js";

export async function appRoutes(app: FastifyInstance): Promise<void> {
  // Public
  app.post("/onboarding/users", createUser);
  app.post("/onboarding/users/login", loginUser);

  // Protected - Users
  app.get("/onboarding/users", { preHandler: authenticate }, listUsers);
  app.get("/onboarding/users/:id", { preHandler: authenticate }, getUserById);
  app.patch("/onboarding/users/:id", { preHandler: authenticate }, updateUser);
  app.delete("/onboarding/users/:id", { preHandler: authenticate }, deleteUser);

  // Protected - Resources
  app.post("/resources", { preHandler: authenticate }, uploadResource);
  app.get("/resources", { preHandler: authenticate }, listResources);
  app.get("/resources/:id", { preHandler: authenticate }, getResourceById);
  app.delete("/resources/:id", { preHandler: authenticate }, deleteResource);
  app.post("/resources/:id/query", { preHandler: authenticate }, queryResource);
  app.post("/resources/query", { preHandler: authenticate }, queryAllResources);
}
