# Resources PDF RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `resources` module — upload de PDF via back-end → armazenamento no MinIO → vetorização assíncrona com Gemini → Qdrant → RAG (perguntas, resumos, soluções de tarefas).

**Architecture:** Upload dispara salvamento no MinIO e criação de registro MongoDB com `status: pending`, responde 202 imediatamente. Processamento (extração de texto → chunking → embeddings → Qdrant) roda em background no mesmo processo via fire-and-forget. RAG: embed da pergunta → busca no Qdrant filtrada por userId → geração de resposta com Gemini Flash.

**Tech Stack:** Fastify 5 + `@fastify/multipart`, MinIO JS client, `pdf-parse`, `@google/generative-ai` (text-embedding-004 + gemini-1.5-flash), `@qdrant/js-client-rest`, Mongoose, Zod, Pino.

---

## File Map

**New files:**
- `src/infra/minio.ts` — MinIO client singleton + bucket init
- `src/infra/qdrant.ts` — Qdrant client singleton + collection init
- `src/infra/gemini.ts` — Gemini client singleton (embedding + generation models)
- `src/models/resource.model.ts` — Mongoose schema com status tracking
- `src/schemas/resources/uploadResource.ts` — Zod (sem body, só validação interna)
- `src/schemas/resources/queryResource.ts` — Zod `{ question: string }`
- `src/schemas/resources/resourceParams.ts` — Zod `{ id: string }`
- `src/services/resources/processResourceService.ts` — extração + chunking + embeddings + Qdrant + update MongoDB
- `src/services/resources/uploadResourceService.ts` — MinIO put + MongoDB create + dispara processamento
- `src/services/resources/listResourcesService.ts` — lista recursos do usuário
- `src/services/resources/getResourceByIdService.ts` — busca recurso por ID
- `src/services/resources/deleteResourceService.ts` — deleta MinIO + Qdrant vectors + MongoDB doc
- `src/services/resources/queryResourceService.ts` — RAG completo
- `src/controller/resources/uploadResource.ts`
- `src/controller/resources/listResources.ts`
- `src/controller/resources/getResourceById.ts`
- `src/controller/resources/deleteResource.ts`
- `src/controller/resources/queryResource.ts`

**Modified files:**
- `docker-compose.yml` — adiciona MinIO + Qdrant
- `.env.dev` — adiciona variáveis MinIO, Qdrant, Gemini
- `src/env/index.ts` — adiciona vars ao schema Zod
- `src/exceptions/errors.ts` — adiciona `RESOURCE` errors
- `src/app.ts` — registra `@fastify/multipart`
- `src/routes/routes.ts` — adiciona rotas de resources
- `src/server.ts` — chama init do MinIO e Qdrant no startup

---

## Task 1: Infrastructure — Docker, Env, Packages

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.dev`
- Modify: `src/env/index.ts`

- [ ] **Step 1: Adicionar MinIO e Qdrant ao docker-compose.yml**

Substituir o conteúdo de `docker-compose.yml`:

```yaml
services:
  mongodb:
    image: mongo:7
    container_name: cronos-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: cronos-ai
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: cronos-minio
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5

  qdrant:
    image: qdrant/qdrant:latest
    container_name: cronos-qdrant
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/healthz"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    container_name: cronos-app
    ports:
      - "3333:3333"
    environment:
      NODE_ENV: DEV
      PORT: 3333
      DATABASE_URL: mongodb://mongodb:27017/cronos-ai
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
      MINIO_BUCKET: cronos-ai-resources
      MINIO_USE_SSL: "false"
      QDRANT_URL: http://qdrant:6333
      QDRANT_COLLECTION: resources
    depends_on:
      mongodb:
        condition: service_healthy
      minio:
        condition: service_healthy
      qdrant:
        condition: service_healthy

volumes:
  mongodb_data:
  minio_data:
  qdrant_data:
```

- [ ] **Step 2: Adicionar vars ao .env.dev**

Adicionar ao final de `.env.dev`:

```
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=cronos-ai-resources
MINIO_USE_SSL=false
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=resources
GEMINI_API_KEY=your-gemini-api-key-here
```

> Obter `GEMINI_API_KEY` em https://aistudio.google.com/apikey (gratuito)

- [ ] **Step 3: Atualizar src/env/index.ts**

```typescript
import { config } from "dotenv";
config({ path: ".env.dev" });

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["DEV", "TEST", "PROD"]).default("DEV"),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters"),
  MINIO_ENDPOINT: z.string().default("localhost"),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_BUCKET: z.string().default("cronos-ai-resources"),
  MINIO_USE_SSL: z.string().default("false").transform((v) => v === "true"),
  QDRANT_URL: z.string().url().default("http://localhost:6333"),
  QDRANT_COLLECTION: z.string().default("resources"),
  GEMINI_API_KEY: z.string(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("Invalid variables", z.treeifyError(_env.error));
  throw new Error("Invalid environment variables.");
}

export const env = _env.data;
```

- [ ] **Step 4: Instalar dependências**

```bash
npm install minio @qdrant/js-client-rest @google/generative-ai @fastify/multipart pdf-parse
npm install -D @types/pdf-parse
```

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env.dev src/env/index.ts package.json package-lock.json
git commit -m "feat: add MinIO, Qdrant, Gemini infra config and deps"
```

---

## Task 2: Infra Clients

**Files:**
- Create: `src/infra/minio.ts`
- Create: `src/infra/qdrant.ts`
- Create: `src/infra/gemini.ts`

- [ ] **Step 1: Criar src/infra/minio.ts**

```typescript
import { Client } from "minio";
import { env } from "../env/index.js";

export const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

export async function ensureMinioReady(): Promise<void> {
  const exists = await minioClient.bucketExists(env.MINIO_BUCKET);
  if (!exists) {
    await minioClient.makeBucket(env.MINIO_BUCKET);
  }
}
```

- [ ] **Step 2: Criar src/infra/qdrant.ts**

```typescript
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
```

- [ ] **Step 3: Criar src/infra/gemini.ts**

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../env/index.js";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

export const generationModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});
```

- [ ] **Step 4: Commit**

```bash
git add src/infra/
git commit -m "feat: add MinIO, Qdrant and Gemini client singletons"
```

---

## Task 3: Resource Model + Errors

**Files:**
- Create: `src/models/resource.model.ts`
- Modify: `src/exceptions/errors.ts`

- [ ] **Step 1: Criar src/models/resource.model.ts**

```typescript
import mongoose from "mongoose";

export type ResourceStatus = "pending" | "processing" | "done" | "error";

export interface IResource {
  userId: mongoose.Types.ObjectId;
  originalName: string;
  mimeType: string;
  size: number;
  minioKey: string;
  status: ResourceStatus;
  errorMessage?: string;
  vectorCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const resourceSchema = new mongoose.Schema<IResource>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    originalName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    minioKey: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "done", "error"],
      default: "pending",
    },
    errorMessage: { type: String },
    vectorCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

resourceSchema.index({ userId: 1, status: 1 });

export const Resource = mongoose.model<IResource>("Resource", resourceSchema);
```

- [ ] **Step 2: Atualizar src/exceptions/errors.ts**

```typescript
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
  RESOURCE: {
    NO_FILE: { message: "No file provided" },
    INVALID_FILE_TYPE: { message: "Only PDF files are accepted" },
    NOT_FOUND: { message: "Resource not found" },
    INVALID_ID: { message: "Invalid resource ID" },
    NOT_READY: { message: "Resource is still being processed" },
  },
} as const;
```

- [ ] **Step 3: Commit**

```bash
git add src/models/resource.model.ts src/exceptions/errors.ts
git commit -m "feat: add Resource model and resource error messages"
```

---

## Task 4: Process Service (PDF → Qdrant)

**Files:**
- Create: `src/services/resources/processResourceService.ts`

Este serviço roda em background (não espera resposta do cliente). Ele:
1. Baixa o PDF do MinIO
2. Extrai o texto com `pdf-parse`
3. Divide em chunks de ~800 chars com 100 de overlap
4. Gera embeddings com `text-embedding-004`
5. Insere vetores no Qdrant
6. Atualiza o status no MongoDB para `done` (ou `error`)

- [ ] **Step 1: Criar src/services/resources/processResourceService.ts**

```typescript
import { randomUUID } from "node:crypto";
import pdfParse from "pdf-parse";
import { Resource } from "../../models/resource.model.js";
import { minioClient } from "../../infra/minio.js";
import { qdrantClient } from "../../infra/qdrant.js";
import { embeddingModel } from "../../infra/gemini.js";
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
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

export async function processResourceService(
  resourceId: string,
  userId: string,
  minioKey: string
): Promise<void> {
  logger.info({ resourceId }, "IN - processResourceService");

  try {
    await Resource.findByIdAndUpdate(resourceId, { status: "processing" });

    const buffer = await downloadFromMinio(minioKey);
    const parsed = await pdfParse(buffer);
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

    await qdrantClient.upsert(env.QDRANT_COLLECTION, { wait: true, points });

    await Resource.findByIdAndUpdate(resourceId, {
      status: "done",
      vectorCount: points.length,
    });

    logger.info({ resourceId, vectorCount: points.length }, "OUT - processResourceService");
  } catch (err) {
    logger.error({ resourceId, err }, "processResourceService :: error");
    await Resource.findByIdAndUpdate(resourceId, {
      status: "error",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/resources/processResourceService.ts
git commit -m "feat: add PDF processing service (extract, chunk, embed, Qdrant)"
```

---

## Task 5: Upload Service

**Files:**
- Create: `src/services/resources/uploadResourceService.ts`

- [ ] **Step 1: Criar src/services/resources/uploadResourceService.ts**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/services/resources/uploadResourceService.ts
git commit -m "feat: add upload resource service with async processing trigger"
```

---

## Task 6: List + GetById Services

**Files:**
- Create: `src/services/resources/listResourcesService.ts`
- Create: `src/services/resources/getResourceByIdService.ts`

- [ ] **Step 1: Criar src/services/resources/listResourcesService.ts**

```typescript
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
```

- [ ] **Step 2: Criar src/services/resources/getResourceByIdService.ts**

```typescript
import mongoose from "mongoose";
import { Resource } from "../../models/resource.model.js";
import { GeneralErrorResponse } from "../../exceptions/GeneralErrorResponse.js";
import { statusCode } from "../../exceptions/statusCode.js";
import { ERRORS } from "../../exceptions/errors.js";
import { logger } from "../../logger/index.js";

export async function getResourceByIdService(resourceId: string, userId: string) {
  logger.info({ resourceId }, "IN - getResourceByIdService");

  if (!mongoose.isValidObjectId(resourceId)) {
    throw new GeneralErrorResponse(statusCode.BAD_REQUEST, ERRORS.RESOURCE.INVALID_ID.message);
  }

  const resource = await Resource.findOne({ _id: resourceId, userId }).lean();

  if (!resource) {
    throw new GeneralErrorResponse(statusCode.NOT_FOUND, ERRORS.RESOURCE.NOT_FOUND.message);
  }

  const result = {
    id: resource._id,
    originalName: resource.originalName,
    mimeType: resource.mimeType,
    size: resource.size,
    status: resource.status,
    errorMessage: resource.errorMessage,
    vectorCount: resource.vectorCount,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  };

  logger.info({ resourceId }, "OUT - getResourceByIdService");
  return result;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/resources/listResourcesService.ts src/services/resources/getResourceByIdService.ts
git commit -m "feat: add list and getById resource services"
```

---

## Task 7: Delete Service

**Files:**
- Create: `src/services/resources/deleteResourceService.ts`

- [ ] **Step 1: Criar src/services/resources/deleteResourceService.ts**

```typescript
import mongoose from "mongoose";
import { Resource } from "../../models/resource.model.js";
import { minioClient } from "../../infra/minio.js";
import { qdrantClient } from "../../infra/qdrant.js";
import { GeneralErrorResponse } from "../../exceptions/GeneralErrorResponse.js";
import { statusCode } from "../../exceptions/statusCode.js";
import { ERRORS } from "../../exceptions/errors.js";
import { env } from "../../env/index.js";
import { logger } from "../../logger/index.js";

export async function deleteResourceService(resourceId: string, userId: string): Promise<void> {
  logger.info({ resourceId }, "IN - deleteResourceService");

  if (!mongoose.isValidObjectId(resourceId)) {
    throw new GeneralErrorResponse(statusCode.BAD_REQUEST, ERRORS.RESOURCE.INVALID_ID.message);
  }

  const resource = await Resource.findOne({ _id: resourceId, userId });

  if (!resource) {
    throw new GeneralErrorResponse(statusCode.NOT_FOUND, ERRORS.RESOURCE.NOT_FOUND.message);
  }

  if (resource.minioKey) {
    await minioClient.removeObject(env.MINIO_BUCKET, resource.minioKey);
  }

  if (resource.status === "done") {
    await qdrantClient.delete(env.QDRANT_COLLECTION, {
      filter: {
        must: [
          { key: "resourceId", match: { value: resourceId } },
          { key: "userId", match: { value: userId } },
        ],
      },
    });
  }

  await Resource.findByIdAndDelete(resourceId);

  logger.info({ resourceId }, "OUT - deleteResourceService");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/resources/deleteResourceService.ts
git commit -m "feat: add delete resource service (MinIO + Qdrant + MongoDB)"
```

---

## Task 8: Query (RAG) Service

**Files:**
- Create: `src/services/resources/queryResourceService.ts`

O fluxo RAG:
1. Embed da pergunta do usuário
2. Busca vetorial no Qdrant filtrada por `userId` (e `resourceId` se fornecido)
3. Monta contexto com os trechos mais relevantes
4. Gera resposta com Gemini Flash usando o contexto

- [ ] **Step 1: Criar src/services/resources/queryResourceService.ts**

```typescript
import { embeddingModel, generationModel } from "../../infra/gemini.js";
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
      throw new GeneralErrorResponse(statusCode.BAD_REQUEST, ERRORS.RESOURCE.INVALID_ID.message);
    }

    const resource = await Resource.findOne({
      _id: input.resourceId,
      userId: input.userId,
    });

    if (!resource) {
      throw new GeneralErrorResponse(statusCode.NOT_FOUND, ERRORS.RESOURCE.NOT_FOUND.message);
    }

    if (resource.status !== "done") {
      throw new GeneralErrorResponse(statusCode.BAD_REQUEST, ERRORS.RESOURCE.NOT_READY.message);
    }
  }

  const embedResult = await embeddingModel.embedContent(input.question);
  const queryVector = embedResult.embedding.values;

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
      answer: "Não encontrei informações relevantes nos seus documentos para responder esta pergunta.",
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

  const generation = await generationModel.generateContent(prompt);
  const answer = generation.response.text();

  const sources = searchResults.map((r) => ({
    chunkIndex: r.payload?.["chunkIndex"] as number,
    score: r.score,
    excerpt: (String(r.payload?.["text"] ?? "")).slice(0, 200),
  }));

  logger.info({ resourceId: input.resourceId }, "OUT - queryResourceService");
  return { answer, sources };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/resources/queryResourceService.ts
git commit -m "feat: add RAG query service (embed + Qdrant search + Gemini generation)"
```

---

## Task 9: Schemas

**Files:**
- Create: `src/schemas/resources/resourceParams.ts`
- Create: `src/schemas/resources/queryResource.ts`

- [ ] **Step 1: Criar src/schemas/resources/resourceParams.ts**

```typescript
import { z } from "zod";

export const resourceParamsSchema = z.object({
  id: z.string().min(1),
});

export type ResourceParams = z.infer<typeof resourceParamsSchema>;
```

- [ ] **Step 2: Criar src/schemas/resources/queryResource.ts**

```typescript
import { z } from "zod";

export const queryResourceSchema = z.object({
  question: z.string().min(1, "Question cannot be empty").max(1000),
});

export type QueryResourceInput = z.infer<typeof queryResourceSchema>;
```

- [ ] **Step 3: Commit**

```bash
git add src/schemas/resources/
git commit -m "feat: add resource Zod schemas"
```

---

## Task 10: Controllers

**Files:**
- Create: `src/controller/resources/uploadResource.ts`
- Create: `src/controller/resources/listResources.ts`
- Create: `src/controller/resources/getResourceById.ts`
- Create: `src/controller/resources/deleteResource.ts`
- Create: `src/controller/resources/queryResource.ts`

- [ ] **Step 1: Criar src/controller/resources/uploadResource.ts**

```typescript
import type { FastifyRequest, FastifyReply } from "fastify";
import { uploadResourceService } from "../../services/resources/uploadResourceService.js";
import { GeneralErrorResponse } from "../../exceptions/GeneralErrorResponse.js";
import { statusCode } from "../../exceptions/statusCode.js";
import { ERRORS } from "../../exceptions/errors.js";
import { logger } from "../../logger/index.js";

export async function uploadResource(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  logger.info("IN - uploadResource");

  const data = await request.file();

  if (!data) {
    throw new GeneralErrorResponse(statusCode.BAD_REQUEST, ERRORS.RESOURCE.NO_FILE.message);
  }

  if (data.mimetype !== "application/pdf") {
    throw new GeneralErrorResponse(
      statusCode.BAD_REQUEST,
      ERRORS.RESOURCE.INVALID_FILE_TYPE.message
    );
  }

  const buffer = await data.toBuffer();

  const resource = await uploadResourceService({
    userId: request.user.id,
    originalName: data.filename,
    mimeType: data.mimetype,
    buffer,
  });

  logger.info("OUT - uploadResource");
  reply.status(statusCode.CREATED).send({ resource });
}
```

- [ ] **Step 2: Criar src/controller/resources/listResources.ts**

```typescript
import type { FastifyRequest, FastifyReply } from "fastify";
import { listResourcesService } from "../../services/resources/listResourcesService.js";
import { statusCode } from "../../exceptions/statusCode.js";
import { logger } from "../../logger/index.js";

export async function listResources(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  logger.info("IN - listResources");

  const resources = await listResourcesService(request.user.id);

  logger.info("OUT - listResources");
  reply.status(statusCode.OK).send({ resources });
}
```

- [ ] **Step 3: Criar src/controller/resources/getResourceById.ts**

```typescript
import type { FastifyRequest, FastifyReply } from "fastify";
import { validate } from "../../schemas/validate.js";
import { resourceParamsSchema } from "../../schemas/resources/resourceParams.js";
import { getResourceByIdService } from "../../services/resources/getResourceByIdService.js";
import { statusCode } from "../../exceptions/statusCode.js";
import { logger } from "../../logger/index.js";

export async function getResourceById(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  logger.info("IN - getResourceById");

  const { id } = validate(resourceParamsSchema, request.params);
  const resource = await getResourceByIdService(id, request.user.id);

  logger.info("OUT - getResourceById");
  reply.status(statusCode.OK).send({ resource });
}
```

- [ ] **Step 4: Criar src/controller/resources/deleteResource.ts**

```typescript
import type { FastifyRequest, FastifyReply } from "fastify";
import { validate } from "../../schemas/validate.js";
import { resourceParamsSchema } from "../../schemas/resources/resourceParams.js";
import { deleteResourceService } from "../../services/resources/deleteResourceService.js";
import { statusCode } from "../../exceptions/statusCode.js";
import { logger } from "../../logger/index.js";

export async function deleteResource(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  logger.info("IN - deleteResource");

  const { id } = validate(resourceParamsSchema, request.params);
  await deleteResourceService(id, request.user.id);

  logger.info("OUT - deleteResource");
  reply.status(statusCode.NO_CONTENT).send();
}
```

- [ ] **Step 5: Criar src/controller/resources/queryResource.ts**

```typescript
import type { FastifyRequest, FastifyReply } from "fastify";
import { validate } from "../../schemas/validate.js";
import { resourceParamsSchema } from "../../schemas/resources/resourceParams.js";
import { queryResourceSchema } from "../../schemas/resources/queryResource.js";
import { queryResourceService } from "../../services/resources/queryResourceService.js";
import { statusCode } from "../../exceptions/statusCode.js";
import { logger } from "../../logger/index.js";

export async function queryResource(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  logger.info("IN - queryResource");

  const { id } = validate(resourceParamsSchema, request.params);
  const { question } = validate(queryResourceSchema, request.body);

  const result = await queryResourceService({
    question,
    userId: request.user.id,
    resourceId: id,
  });

  logger.info("OUT - queryResource");
  reply.status(statusCode.OK).send(result);
}

export async function queryAllResources(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  logger.info("IN - queryAllResources");

  const { question } = validate(queryResourceSchema, request.body);

  const result = await queryResourceService({
    question,
    userId: request.user.id,
  });

  logger.info("OUT - queryAllResources");
  reply.status(statusCode.OK).send(result);
}
```

- [ ] **Step 6: Commit**

```bash
git add src/controller/resources/ src/schemas/resources/
git commit -m "feat: add resource controllers and schemas"
```

---

## Task 11: Wiring — App, Routes, Server

**Files:**
- Modify: `src/app.ts`
- Modify: `src/routes/routes.ts`
- Modify: `src/server.ts`

- [ ] **Step 1: Registrar @fastify/multipart em src/app.ts**

Adicionar após o import de `fastifyJwt`:

```typescript
import multipart from "@fastify/multipart";
```

Adicionar após `app.register(fastifyJwt, ...)`:

```typescript
app.register(multipart, {
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});
```

O arquivo completo ficará:

```typescript
import fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { logger } from "./logger/index.js";
import { env } from "./env/index.js";
import { GeneralErrorResponse } from "./exceptions/GeneralErrorResponse.js";
import { statusCode } from "./exceptions/statusCode.js";
import { ERRORS } from "./exceptions/errors.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { id: string; email: string };
    user: { id: string; email: string };
  }
}

export const app = fastify({ loggerInstance: logger });

app.register(fastifyJwt, { secret: env.JWT_SECRET });
app.register(multipart, {
  limits: { fileSize: 20 * 1024 * 1024 },
});

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof GeneralErrorResponse) {
    const response: Record<string, unknown> = { error: error.message };
    if (error.details !== undefined) {
      response["details"] = error.details;
    }
    reply.status(error.statusCode).send(response);
    return;
  }

  reply.status(statusCode.INTERNAL_SERVER_ERROR).send({
    error: ERRORS.GENERAL.INTERNAL_SERVER_ERROR.message,
  });
});
```

- [ ] **Step 2: Adicionar rotas de resources em src/routes/routes.ts**

```typescript
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
```

- [ ] **Step 3: Adicionar init de MinIO e Qdrant em src/server.ts**

```typescript
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
```

- [ ] **Step 4: Commit final**

```bash
git add src/app.ts src/routes/routes.ts src/server.ts
git commit -m "feat: wire multipart plugin, resource routes and infra init on startup"
```

---

## Endpoints do Módulo Resources

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/resources` | Upload de PDF (`multipart/form-data`, campo `file`) |
| `GET` | `/resources` | Lista todos os PDFs do usuário |
| `GET` | `/resources/:id` | Detalhes de um PDF (com status de processamento) |
| `DELETE` | `/resources/:id` | Remove PDF do MinIO, vetores do Qdrant e registro do MongoDB |
| `POST` | `/resources/:id/query` | Pergunta sobre um PDF específico `{ question }` |
| `POST` | `/resources/query` | Pergunta sobre todos os PDFs do usuário `{ question }` |

## Como testar manualmente

```bash
# Subir containers
docker compose up -d

# Upload de PDF
curl -X POST http://localhost:3333/resources \
  -H "Authorization: Bearer <token>" \
  -F "file=@/caminho/para/arquivo.pdf"

# Verificar status de processamento
curl http://localhost:3333/resources/<id> \
  -H "Authorization: Bearer <token>"

# Fazer uma pergunta (aguardar status: done)
curl -X POST http://localhost:3333/resources/<id>/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"question": "Qual é o tema principal deste documento?"}'
```

> MinIO Console disponível em http://localhost:9001 (minioadmin / minioadmin)
