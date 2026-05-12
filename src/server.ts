import { app } from "./app.js";
import { appRoutes } from "./routes/routes.js";
import { connectDB } from "./database/database.js";
import { ensureMinioReady } from "./infra/minio.js";
import { ensureQdrantReady } from "./infra/qdrant.js";
import { env } from "./env/index.js";

app.register(appRoutes);

const start = async (): Promise<void> => {
  try {
    await connectDB();
    await ensureMinioReady();
    await ensureQdrantReady();
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    console.log(`Server running on port ${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
