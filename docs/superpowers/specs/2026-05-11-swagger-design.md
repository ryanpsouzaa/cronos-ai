---
title: Swagger estático — cronos-ai
date: 2026-05-11
status: approved
---

# Design: swagger.yaml estático

## Objetivo

Gerar um arquivo `swagger.yaml` (OpenAPI 3.0.3) estático na raiz do projeto para servir como contrato de API durante o desenvolvimento do front-end. Não será exposto via rota — apenas consultado localmente (ex.: Swagger Editor, VS Code extension).

## Escopo

- 12 rotas documentadas (2 públicas, 10 protegidas por JWT)
- 2 tags: `Users`, `Resources`
- Security scheme: `BearerAuth` (JWT Bearer)
- Servidor: `http://localhost:3333`
- Schemas reutilizáveis via `components`

## Rotas

| Método | Rota | Auth | Status |
|--------|------|------|--------|
| POST | `/onboarding/users` | — | 201 |
| POST | `/onboarding/users/login` | — | 200 |
| GET | `/onboarding/users` | JWT | 200 |
| GET | `/onboarding/users/{id}` | JWT | 200 |
| PATCH | `/onboarding/users/{id}` | JWT | 200 |
| DELETE | `/onboarding/users/{id}` | JWT | 204 |
| POST | `/resources` | JWT | 201 |
| GET | `/resources` | JWT | 200 |
| GET | `/resources/{id}` | JWT | 200 |
| DELETE | `/resources/{id}` | JWT | 204 |
| POST | `/resources/{id}/query` | JWT | 200 |
| POST | `/resources/query` | JWT | 200 |

## Components (schemas)

- `User` — id, name, email, createdAt, updatedAt
- `Resource` — id, userId, originalName, mimeType, size, minioKey, status, errorMessage, vectorCount, createdAt, updatedAt
- `QueryResult` — answer, sources[]
- `ErrorResponse` — error
