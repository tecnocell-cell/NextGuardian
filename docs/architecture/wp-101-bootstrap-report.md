# WP-101 — Bootstrap backend concluído

Data: 2026-09-12. Escopo executado exclusivamente WP-101. WP-001 recebido concluído/validado. WP-102 NÃO INICIADO.

## Decisões confirmadas no repositório

Lidos CODEX-START-HERE, codex-work-packages, docs 20, 21, 24, 28, 30, inventário e changelog. WP-101 escolhe NestJS, env Zod, pino e Dockerfile; doc 21 define Workspace. ADR-0003/0012 confirmados como ACEITOS conforme autorização explícita para seguir o pacote. Marca NextGuardian, IDs nexguardian, MVP Family/Responsible, Core único, autoridade temporal do servidor e preservação Android mantidos. Não reabertas decisões de marca/perfil.

Tenancy está aceita como invariante: dados futuros escopados por Workspace e claim do token. Não há tabela/dado de tenant neste bootstrap, portanto NÃO se alega isolamento executável já testado. Isso é critério do WP-102. accountId do OpenAPI estabilizado permanece inalterado.

## Estrutura e stack efetiva

`services/api`: monólito modular NestJS, único módulo health, shared/config e shared/logging. Nenhum módulo de negócio reservado artificialmente. Nenhum schema, migration, Prisma client ou conexão Postgres.

| Camada | Adotado |
| --- | --- |
| Runtime | Node 24.14.0 local / npm 11.9.0; imagem Node 24 |
| Linguagem | TypeScript 5.9.3, NodeNext/ESM, strict |
| Framework | NestJS common/core/platform-express 12.0.1; Express padrão |
| Config | Zod 4.6.2 + dotenv 17.4.2 |
| Logs | pino 10.3.1 + pino-http 11.0.0 |
| Testes | Jest 30.5.1 + ts-jest 29.4.12 + supertest 7.2.2 |
| Lint | ESLint 10.10.0 + typescript-eslint 8.70.0 |
| Banco futuro | PostgreSQL/Prisma aceitos, NÃO instalados/implementados |

`GET /health` retorna apenas `{"status":"ok"}` e Cache-Control no-store. Liveness do processo, não saúde de banco ou status do produto. Rota operacional fora do OpenAPI de negócio. Sem auth, trial real, heartbeat real ou novos endpoints de negócio. Host local padrão 127.0.0.1. Config inválida impede startup.

Logs JSON: requestId novo gerado pelo servidor, header X-Request-Id, correlationId UUID válido ou fallback ao requestId. IDs não autorizam nem selecionam Workspace. Serializadores permitem apenas método, ID e status HTTP; não registram URL/query, cabeçalhos/cookies/corpos. Testes comprovam omissão de valores sensíveis enviados à API de teste. Observabilidade não foi confundida com AuditLog.

Dockerfile multi-stage, npm ci, runtime sem devDependencies, usuário node, healthcheck e .dockerignore. Sem Compose Postgres: permitido pelo pacote, porém opcional e desnecessário para liveness sem banco. CI e deploy não iniciados.

## Comandos e resultados

Executados em services/api salvo indicação:

| Comando/check | Resultado |
| --- | --- |
| npm install --no-fund --no-audit | Dependências e package-lock.json gerados |
| npm run build | PASS, TypeScript compilou src em dist |
| npm run typecheck | PASS, incluindo testes |
| npm run lint | PASS, sem erros |
| npm test | PASS, 2 suites / 11 testes |
| node dist/main.js + GET /health em loopback/porta efêmera | HTTP 200, body esperado, X-Request-Id UUID; processo encerrado após smoke |
| node dist/main.js com PORT=invalid | exit 1, startup rejeitado |
| npm ls --depth=0 | Árvore válida; versões registradas acima |
| npm audit --omit=dev | Zero vulnerabilidades conhecidas no runtime no momento da consulta |
| docker version --format '{{.Server.Version}}' | FAIL ambiental: pipe dockerDesktopLinuxEngine ausente, daemon indisponível |
| Comparação SHA-256 antes/depois | Todos os 62 arquivos protegidos de fontes/config/docs Android e contracts intactos |

Não foi executado docker build/run por indisponibilidade do daemon. Dockerfile entregue, execução em container ainda não validada. Nenhum rebuild Android necessário: fontes preservadas. Npm ci está documentado e usado no Dockerfile, mas não foi executado localmente nesta rodada. Auditoria dev completa não executada; zero vulnerabilidades refere-se ao comando com omit=dev.

Cobertura de testes: health unitário; defaults seguros; cinco portas inválidas; env/log level inválidos sem exposição de valores; HTTP 200/no-store/requestId; correlação e logs sem segredos; rota de negócio ausente/404 sem logar password.

## Erros/divergências encontrados e resolvidos

1. Documentos 24/28 chamavam bootstrap de WP-001 e entrada ainda apontava WP-001 pendente. Atualizados para WP-101; história anterior preservada.
2. ADR-0003/0012 ainda PROPOSTA apesar de WP-001 concluído. O próprio pacote permite confirmação no kickoff; aceitos conforme instrução atual.
3. NestJS 12 distribui ESM: tentativa inicial CommonJS passou tsc/lint, mas falhou Jest. Corrigidos package type, NodeNext, imports e configuração ESM dos testes; import nomeado pinoHttp corrigiu tipagem NodeNext. Validação final integral passou.
4. TypeScript 7 disponível não é compatível com peer dependency ts-jest (<7); fixado 5.9.3. Não é imitação do APK.
5. ESLint 9 apontou descontinuação durante instalação; adotado ESLint 10.
6. Audit inicial apontou Multer 2.2.0 transitivo do adaptador Express. Override para 2.3.0 (mesma major, correção disponível) aplicado; audit final runtime zerado. Não há upload endpoint. Revisar/remover override quando Nest atualizar a dependência.
7. Jest ESM emite ExperimentalWarning de VM Modules; afeta execução dos testes, não startup do servidor. Testes passaram. Container não validado por daemon ausente.

## Critérios de aceite, um por um

| Critério WP-101 | Evidência | Estado |
| --- | --- | --- |
| npm test verde | 2 suites, 11 testes, zero falhas | ATENDIDO |
| /health 200 | supertest e processo compilado em Node | ATENDIDO |
| typecheck ok | npm run typecheck exit 0 | ATENDIDO |
| lint ok | npm run lint exit 0 | ATENDIDO |
| servidor sobe e testes passam (condição de parada) | smoke real e testes finais | ATENDIDO |

Entregáveis adicionais do pacote: app NestJS/TS, configuração env Zod, logs pino/requestId e Dockerfile CRIADOS; doc 24, inventário e changelog atualizados. Container não é declarado testado. Preservação de Android/contratos ATENDIDA. Endpoints de negócio e banco FORA DE ESCOPO e não criados.

## Arquivos criados

- `services/api/.dockerignore`
- `services/api/.env.example`
- `services/api/.gitignore`
- `services/api/Dockerfile`
- `services/api/README.md`
- `services/api/eslint.config.mjs`
- `services/api/jest.config.cjs`
- `services/api/package-lock.json`
- `services/api/package.json`
- `services/api/src/app.module.ts`
- `services/api/src/application.ts`
- `services/api/src/main.ts`
- `services/api/src/modules/health/health.controller.ts`
- `services/api/src/modules/health/health.module.ts`
- `services/api/src/modules/health/health.service.ts`
- `services/api/src/shared/config/environment.ts`
- `services/api/src/shared/logging/http-logger.ts`
- `services/api/test/health.spec.ts`
- `services/api/test/http.spec.ts`
- `services/api/tsconfig.build.json`
- `services/api/tsconfig.json`

- `docs/architecture/wp-101-bootstrap-report.md` (este relatório).

## Arquivos documentais atualizados

- `docs/architecture/20-adr-registry.md`
- `docs/architecture/21-dominio-erd-tenancy.md`
- `docs/architecture/24-backend-stack.md`
- `docs/architecture/28-observabilidade.md`
- `docs/architecture/11-inventario-estado-real.md`
- `docs/architecture/CODEX-START-HERE.md`
- `docs/architecture/architecture-changelog.md`

Build gerou `services/api/dist`; instalação gerou `node_modules`, ambos ignorados. Auxiliares temporários de edição foram removidos do workspace. Nenhum commit/deploy realizado. Relatórios históricos e APK não modificados.

OpenAPI SHA-256 preservado: `1156eda65d0fb43770cba8025f9a8a17b0962f7ec7027638d10d13438e099c8f`.

WP-101 CONCLUÍDO. WP-102 NÃO FOI INICIADO. Parada após esta entrega.
