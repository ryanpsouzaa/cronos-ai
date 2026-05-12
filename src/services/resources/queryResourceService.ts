import { embedText, generateText } from "../../infra/gemini.js";
import { qdrantClient } from "../../infra/qdrant.js";
import { Resource } from "../../models/resource.model.js";
import { GeneralErrorResponse } from "../../exceptions/GeneralErrorResponse.js";
import { statusCode } from "../../exceptions/statusCode.js";
import { ERRORS } from "../../exceptions/errors.js";
import { env } from "../../env/index.js";
import { logger } from "../../logger/index.js";
import mongoose from "mongoose";

export interface QueryResourceInput {
  question: string;
  userId: string;
  resourceId?: string;
}

export async function queryResourceService(input: QueryResourceInput) {
  logger.info({ resourceId: input.resourceId }, "IN - queryResourceService");

  if (input.resourceId) {
    if (!mongoose.isValidObjectId(input.resourceId)) {
      throw new GeneralErrorResponse(
        statusCode.BAD_REQUEST,
        ERRORS.RESOURCE.INVALID_ID.message,
      );
    }

    const resource = await Resource.findOne({
      _id: input.resourceId,
      userId: input.userId,
    });

    if (!resource) {
      throw new GeneralErrorResponse(
        statusCode.NOT_FOUND,
        ERRORS.RESOURCE.NOT_FOUND.message,
      );
    }

    if (resource.status !== "done") {
      throw new GeneralErrorResponse(
        statusCode.BAD_REQUEST,
        ERRORS.RESOURCE.NOT_READY.message,
      );
    }
  }

  const queryVector = await embedText(input.question);

  const mustFilters: Array<{ key: string; match: { value: string } }> = [
    { key: "userId", match: { value: input.userId } },
  ];

  if (input.resourceId) {
    mustFilters.push({ key: "resourceId", match: { value: input.resourceId } });
  }

  const searchResults = await qdrantClient.search(env.QDRANT_COLLECTION, {
    vector: queryVector,
    limit: 5,
    filter: { must: mustFilters },
    with_payload: true,
  });

  if (searchResults.length === 0) {
    return {
      answer:
        "Não encontrei informações relevantes nos seus documentos para responder esta pergunta.",
      sources: [],
    };
  }

  const context = searchResults
    .map((r, i) => `[${i + 1}] ${String(r.payload?.["text"] ?? "")}`)
    .join("\n\n");

  const prompt = `Você é um assistente acadêmico. Use APENAS o contexto abaixo para responder a pergunta. Se não souber a resposta com base no contexto, diga isso claramente.

Contexto:
${context}

Pergunta: ${input.question}

Resposta:`;

  const answer = await generateText(prompt);

  const sources = searchResults.map((r) => ({
    chunkIndex: r.payload?.["chunkIndex"] as number,
    score: r.score,
    excerpt: String(r.payload?.["text"] ?? "").slice(0, 200),
  }));

  logger.info({ resourceId: input.resourceId }, "OUT - queryResourceService");
  return { answer, sources };
}
