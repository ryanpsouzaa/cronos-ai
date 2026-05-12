import { randomUUID } from "node:crypto";
import { PDFParse } from "pdf-parse";
import { Resource } from "../../models/resource.model.js";
import { minioClient } from "../../infra/minio.js";
import { qdrantClient } from "../../infra/qdrant.js";
import { embedText } from "../../infra/gemini.js";
import { env } from "../../env/index.js";
import { logger } from "../../logger/index.js";

function chunkText(text: string, size = 800, overlap = 100): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size - overlap;
  }
  return chunks.filter((c) => c.trim().length > 0);
}

async function downloadFromMinio(minioKey: string): Promise<Buffer> {
  const stream = await minioClient.getObject(env.MINIO_BUCKET, minioKey);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

async function embedChunk(text: string): Promise<number[]> {
  return embedText(text);
}

export async function processResourceService(
  resourceId: string,
  userId: string,
  minioKey: string,
): Promise<void> {
  logger.info({ resourceId }, "IN - processResourceService");

  try {
    await Resource.findByIdAndUpdate(resourceId, { status: "processing" });

    const buffer = await downloadFromMinio(minioKey);
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const parsed = await parser.getText();
    const chunks = chunkText(parsed.text);

    const points: Array<{
      id: string;
      vector: number[];
      payload: Record<string, unknown>;
    }> = [];

    for (let i = 0; i < chunks.length; i++) {
      const vector = await embedChunk(chunks[i]!);
      points.push({
        id: randomUUID(),
        vector,
        payload: {
          resourceId,
          userId,
          chunkIndex: i,
          text: chunks[i],
        },
      });
    }

    //handle error with try-catch

    await qdrantClient.upsert(env.QDRANT_COLLECTION, { wait: true, points });

    await Resource.findByIdAndUpdate(resourceId, {
      status: "done",
      vectorCount: points.length,
    });

    logger.info(
      { resourceId, vectorCount: points.length },
      "OUT - processResourceService",
    );
  } catch (err) {
    logger.error({ resourceId, err }, "processResourceService :: error");
    await Resource.findByIdAndUpdate(resourceId, {
      status: "error",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
