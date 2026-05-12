import { Resource } from "../../models/resource.model.js";
import { logger } from "../../logger/index.js";

export async function listResourcesService(userId: string) {
  logger.info("IN - listResourcesService");

  const resources = await Resource.find({ userId })
    .select("-minioKey -__v")
    .sort({ createdAt: -1 })
    .lean();

  const result = resources.map((r) => ({
    id: r._id,
    originalName: r.originalName,
    size: r.size,
    status: r.status,
    vectorCount: r.vectorCount,
    createdAt: r.createdAt,
  }));

  logger.info({ count: result.length }, "OUT - listResourcesService");
  return result;
}
