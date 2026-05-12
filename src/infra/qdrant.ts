import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "../env/index.js";

export const qdrantClient = new QdrantClient({ url: env.QDRANT_URL });

export async function ensureQdrantReady(): Promise<void> {
  const { collections } = await qdrantClient.getCollections();
  const exists = collections.some((c) => c.name === env.QDRANT_COLLECTION);
  if (!exists) {
    await qdrantClient.createCollection(env.QDRANT_COLLECTION, {
      vectors: { size: 768, distance: "Cosine" },
    });
  }
}
