# Backend — stack adotada — NextGuardian

Atualizado: 2026-09-12. ADR-0012 ACEITA no WP-101. Bootstrap em `services/api` IMPLEMENTADO PARCIALMENTE; endpoints de negócio e banco continuam ausentes. Prioridade: **simplicidade operacional e testabilidade**, não arquitetura distribuída prematura. **Sem microserviços** sem necessidade demonstrada.

## 1. Recomendação (monólito modular)

| Camada | Recomendado | Alternativa | Razão |
| --- | --- | --- | --- |
| Runtime | **Node.js LTS** | — | contratos já em JSON/OpenAPI; time-to-value |
| Linguagem | **TypeScript** | — | tipagem alinhada aos contratos |
| Framework | **NestJS** | Fastify puro | módulos/DI/estrutura clara para monólito modular e testes |
| Banco | **PostgreSQL** | — | relacional + particionamento de eventos (doc 14); JSONB para payloads |
| Acesso a dados | **Prisma** | Drizzle | migrations e tipos; Drizzle se quiser SQL mais próximo |
| Validação | **Zod** | class-validator | schemas de request/response; espelham OpenAPI |
| Contrato | **OpenAPI 3.1** (existente) | — | fonte de verdade da API (doc 25) |
| Auth | JWT (humano) + credencial de device (doc 22) | — | duas audiências |
| Testes | **Vitest/Jest** + supertest | — | unit + contract + integração |
| Config/secrets | dotenv + env validado por Zod; secrets fora do repo | Vault (futuro) | simples agora |
| Logs | **pino** (structured) | — | requestId/correlationId (doc 28) |
| Container | **Docker** + docker-compose (Postgres) | — | dev reproduzível |

## 2. Estrutura sugerida (monólito modular)
```
services/api/
  src/
    modules/{auth,workspaces,users,devices,enrollment,activation,subscription,heartbeat,events,commands}/
    shared/{db,config,logging,errors,auth}/
    main.ts
  prisma/schema.prisma
  test/
  Dockerfile
```
Cada módulo isolado, mesmo processo. Extrair serviço só se um gargalo real aparecer.

## 3. Princípios
- API dirigida pelo `openapi.json` (auditado no doc 25); Zod valida nas bordas.
- Todo repositório de dados escopado por `workspaceId` (isolamento, doc 21).
- Migrations versionadas; nenhuma escrita destrutiva sem review.
- Idempotency-Key em operações sensíveis (ativação, comandos).

## 4. Estado atual
WP-101: IMPLEMENTADO PARCIALMENTE. NestJS/TypeScript, `/health`, env Zod/dotenv, logs pino com requestId/correlationId, testes Jest/supertest e Dockerfile. Estrutura da seção 2 é direção futura: apenas módulo health + shared/config/logging existem. Sem Prisma, migrations, banco ou endpoints de negócio. Bootstrap é WP-101, não WP-001. Resultados em [wp-101-bootstrap-report.md](wp-101-bootstrap-report.md).


## 5. Atualização WP-102 (2026-09-12)

Prisma/client/adapter-pg 7.10.0 adicionados; PostgreSQL 17.10 existente usado em cluster efêmero. Schema Workspace/User/Membership e migration implementados. Monólito Nest/ESM/config/logger preservado. Dockerfile apenas ajustado para geração do client no build. Sem auth/endpoints de negócio/CI/produção. [Relatório WP-102](wp-102-persistence-report.md).
