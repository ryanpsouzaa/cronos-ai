import { Resource } from "../../models/resource.model.js";
import { minioClient } from "../../infra/minio.js";
import { processResourceService } from "./processResourceService.js";
import { env } from "../../env/index.js";
import { logger } from "../../logger/index.js";

export interface UploadResourceInput {
  userId: string;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

export async function uploadResourceService(input: UploadResourceInput) {
  logger.info("IN - uploadResourceService");

  const resource = await Resource.create({
    userId: input.userId,
    originalName: input.originalName,
    mimeType: input.mimeType,
    size: input.buffer.length,
    minioKey: "",
    status: "pending",
  });

  const minioKey = `${input.userId}/${resource._id.toString()}.pdf`;

  await minioClient.putObject(
    env.MINIO_BUCKET,
    minioKey,
    input.buffer,
    input.buffer.length,
    { "Content-Type": input.mimeType }
  );

  await Resource.findByIdAndUpdate(resource._id, { minioKey });

  // fire-and-forget: não espera o processamento
  void processResourceService(
    resource._id.toString(),
    input.userId,
    minioKey
  );

  const result = {
    id: resource._id,
    originalName: resource.originalName,
    size: resource.size,
    status: "pending" as const,
    createdAt: resource.createdAt,
  };

  logger.info({ resourceId: result.id }, "OUT - uploadResourceService");
  return result;
}
