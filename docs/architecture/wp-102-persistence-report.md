# WP-102 — Persistência base e Workspace

Data: 2026-09-12. Execução exclusiva WP-102. Estado: CONCLUÍDO. WP-103 não iniciado.

## 1. Escopo oficial literalmente relido

## WP-102 — Banco + migrations base + Workspace
- **Objetivo:** Postgres + Prisma; migrations; entidade `Workspace` com `profile` e isolamento.
- **Pré-requisitos:** WP-101.
- **Documentos:** [doc 21](21-dominio-erd-tenancy.md).
- **Pode alterar:** `services/api/prisma/**`, módulo `workspaces`.
- **Não alterar:** Android.
- **Implementação:** schema Workspace/User/Membership; migration; repositório escopado por `workspaceId`.
- **Critérios de aceite:** migration aplica em Postgres efêmero; **teste de isolamento A≠B** passa.
- **Testes:** integração isolamento (obrigatório, doc 29).
- **PARE quando:** isolamento provado por teste.


O pacote não tem itens separados intitulados “Fora de escopo” ou “Doc a atualizar”. Não foram inventados: exclusões vieram da instrução atual; registro em changelog/inventário veio de CODEX-START-HERE. A condição literal de parada é isolamento provado por teste.

Checklist de execução: confirmar WP-101; obedecer ADRs 0003/0012; schema de três modelos; migration versionada; repositório escopado; migration em Postgres efêmero; integração A≠B; regressão; preservar Android/OpenAPI; documentar; parar.

## 2. Preflight e baseline

Repositório efetivo `C:/Users/Root/Documents/nexguardian`. Nenhuma renomeação. WP-001 estabilizado; WP-101 presente com 21 arquivos de backend, health/config/logging/testes/Dockerfile, Node 24.14.0/Nest 12/TS 5.9 ESM. Sem schema/migrations/workspaces antes desta rodada.

Lidos integralmente os arquivos de código/config/teste/README/Docker do WP-101, seu relatório, entrada, seção WP-102, ADRs 20, doc 21 e doc 29. Doc 24/18 consultados para persistência e doc 22 para User sem antecipar auth. Lockfile lido e analisado integralmente por JSON: versão 3, 562 entradas, specs diretas coerentes com package.json, dependências resolvidas em registry.npmjs.org com integridade. Hashes de 152 arquivos existentes registrados antes da primeira alteração.

Scripts `_wp101.py`, `_wp101_docs.py`, `_wp101_finish.py` ausentes no workspace e no projeto; não houve exclusão/refatoração de ferramentas legítimas. Nenhum AGENTS.md aplicável encontrado no projeto.

## 3. Implementação versus pacote

| Item literal | Implementação/evidência |
| --- | --- |
| Postgres + Prisma | Prisma 7.10.0/client/adapter-pg, datasource postgresql; servidor 17.10 real nos testes |
| Workspace com profile e isolamento | WorkspaceProfile explícito; WorkspaceRepository.forWorkspace exige UUID, nunca query sem escopo para dados de Workspace/Membership |
| Schema Workspace/User/Membership | prisma/schema.prisma, somente esses três modelos; User global; FK e PK composta Membership |
| Migration | prisma/migrations/20260912000100_workspace_base/migration.sql, gerada pelo Prisma migrate diff; migration_lock.toml PostgreSQL |
| Repositório escopado | get/rename Workspace, list/find/changeRole/revoke Membership, todos restritos ao workspace vinculado ao objeto |
| Integração isolamento | test/workspaces.integration.spec.ts, 12 testes sem mock de persistência |

Não há controller workspaces ou endpoints de negócio. Escopo de repo é contexto interno confiável; UUID não autentica nem autoriza. WP-103 terá que resolver o contexto autenticado. Nenhum Prisma client bruto é exportado pelo módulo. Pool é lazy; /health continua liveness sem exigir banco; solicitações de persistência sem DATABASE_URL falham. Zod/dotenv existentes validam DATABASE_URL sem revelar valor em erros.

Arquivos de glue além de prisma/** e módulo workspaces são estritamente necessários: package/lock para Prisma, Prisma config, geração no build, Nest composition, env existente, testes/runner e excludes de gerados. Nenhuma abstração paralela, framework/logger/ORM novo ou pacote futuro implementado.

## 4. ADRs obedecidos

| ADR | Aplicação nesta rodada |
| --- | --- |
| 0001 | NextGuardian comercial; nexguardian técnico e Android intactos |
| 0002 | Um Core/Nest; profile em Workspace; sem backend por perfil |
| 0003 | Workspace único boundary; User global conforme doc 21; Membership escopada |
| 0004 | Nenhuma alteração em autoridade temporal; trial não implementado |
| 0005 | DeviceState não alterado/implementado |
| 0006 | Heartbeat/agendamento não antecipados |
| 0007 | FCM não introduzido |
| 0008 | Comandos não introduzidos |
| 0009 | Nada do APK reutilizado |
| 0010 | Nenhuma autenticação humana/device antecipada |
| 0011 | Nenhum trial/entitlement hard-coded no backend |
| 0012 | PostgreSQL/Prisma sobre NestJS/TS; sem microserviços |
| 0013 | Fundação Android congelada |
| 0014 | Fixtures FAMILY; enum BUSINESS apenas do Core, sem MDM |

ADRs já ACEITOS não foram reescritos nem reabertos.

## 5. Dependências

| Nome | Versão | Motivo |
| --- | --- | --- |
| @prisma/client | 7.10.0 | runtime e tipos de persistência exigidos pelo WP |
| @prisma/adapter-pg | 7.10.0 | adaptador PostgreSQL exigido pelo Prisma 7; driver pg transitivo |
| prisma (dev) | 7.10.0 | geração de client, validação e migrations |
| deepmerge-ts (override transitivo) | 8.0.2 | correção de advisory em @prisma/config; CLI/config/migration validados |
| mysql2 (override transitivo) | 3.24.4 | correção de advisories na árvore do Prisma CLI, não adoção de MySQL |

Prisma latest apontou 8.0.0-rc.13; mantida versão estável compatível com Node24 e stack existente. Multer 2.3.0 override do WP-101 preservado. Sem nova biblioteca de logging/config/testes. Lockfile contém árvore completa transitiva. Overrides transitivos corretivos devem ser revistos quando upstream resolver. Não aplicado audit fix --force nem downgrade arquitetural.

## 6. Testes e comandos executados

Todos em services/api, salvo checagem de docs/git no root.

| Comando | Resultado real |
| --- | --- |
| npm install --save-exact @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0 --no-fund --no-audit | PASS |
| npm install --save-dev --save-exact prisma@7.10.0 --no-fund --no-audit | PASS |
| npm install --no-fund --no-audit (após overrides) | PASS |
| npm run db:generate | PASS, client ESM gerado |
| npm run db:validate | PASS |
| prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script --output prisma/migrations/20260912000100_workspace_base/migration.sql | PASS, SQL gerado |
| PG_BIN=bin PostgreSQL17; npm run test:integration | PASS, 1 suite/12 testes |
| prisma migrate deploy (runner, primeira aplicação) | PASS |
| prisma migrate deploy (runner, reaplicação) | PASS, sem nova migration |
| prisma migrate status (runner) | PASS, sem pendências |
| npm test | PASS, 3 suites/14 testes (11 existentes + 3 config DB) |
| npm run typecheck | PASS |
| npm run lint | PASS |
| npm run build | PASS |
| npm audit --omit=dev | PASS, zero vulnerabilidades conhecidas ao final |
| docker version --format '{{.Server.Version}}' | indisponível: pipe dockerDesktopLinuxEngine ausente |

Total: 26 testes aprovados em 4 suites (14 regressão/config/HTTP + 12 integração). Nenhum teste ignorado para simular aceite. `npm test` não inclui integração; comando separado explícito e obrigatório, descrito no README. Os 11 testes anteriores foram preservados.

Integração prova: migration registrada no PostgreSQL; role não superuser; rejeição de escopo vazio/undefined; listagem A/B; leitura por ID cruzado; mutações cruzadas nos dois sentidos; usuário global compartilhado preserva membership do outro workspace; rename só no scope; workspace inexistente não lê/escreve; UNIQUE email; PK composta/FKs. Não prova auth HTTP (inexistente) nem entidades futuras Device/Event/Command.

## 7. Docker e PostgreSQL

Docker não instalado/reconfigurado. Doc 29 sugeria PostgreSQL de teste via Docker; critério literal do WP exige Postgres efêmero, não container. Binários PostgreSQL 17.10 já instalados em Program Files usados com cluster novo, porta livre em loopback e credenciais aleatórias. Não utilizado serviço/banco do usuário. Serviço postgresql-x64-17 permaneceu Running. Role da aplicação do teste não era superuser.

Runner scripts/test-postgres.mjs é ferramenta permanente documentada, sem senha fixa. Cria e remove cluster por execução, não aceita URL externa. Primeira tentativa Windows falhou porque pg_ctl herdou pipes e a chamada não retornou antes do timeout; corrigido com stdio apropriado e controle de stop. Resíduo da tentativa falha removido apenas após verificar caminho temporário exato e ausência de processo associado. Execução aprovada removeu cluster e credenciais. Nenhum diretório nexguardian-wp102-* remanescente no TEMP ao conferir.

Dockerfile recebeu somente cópia schema/config para geração do client no build. Imagem não construída por daemon indisponível; isso não invalida os critérios literais cumpridos em PostgreSQL real.

## 8. Divergências/limites documentados

1. Doc 29 ainda dizia backend ausente/nasceria WP-001; acrescentado estado real, sem refazer documento inteiro.
2. Doc 21 diz genericamente toda tabela de negócio tem workspaceId mas define User global. Aplicada exceção explícita: Workspace é raiz, User global e Membership com workspaceId; sem segundo tenant/account.
3. Profile imutável pela API do repositório (não há setter), sem trigger contra DBA/SQL direto. Isolamento é aplicado no repositório conforme WP, não RLS nem proteção contra acesso arbitrário ao banco.
4. Doc 21 é conceitual: naming físico usa defaults do Prisma e IDs explícitos documentados, sem convenção paralela. Email UNIQUE exato; canonicalização de login não decidida nesta rodada. passwordHash nullable (sem credencial atual); hash/verificação de login são WP-103, não incluídos.
5. Ambiente não tem Docker daemon; teste nativo mantém PostgreSQL real/efêmero. Nenhum blocker arquitetural material ficou pendente.
6. Audit inicial após Prisma acusou dependências transitivas (deepmerge-ts/mysql2). Overrides corrigiram; config/migration e testes passaram. Audit final omite dev conforme comando exigido; não é declaração de segurança absoluta nem auditoria de código.
7. Warning experimental de VM Modules já existe no stack Jest/ESM WP-101; testes aprovados. Prisma CLI oferece RC8; não adotada.
8. Banco permanente, readiness DB, credenciais de produção e políticas de auth não provisionados. Health permanece sem banco por design do WP-101.

## 9. Aceite item por item

| Item | Estado/evidência |
| --- | --- |
| Objetivo: Postgres + Prisma/migrations/Workspace(profile)/isolamento | ✅ schema, migration, módulo e testes reais |
| Pré-requisito WP-101 | ✅ arquivos/lock/report e regressão confirmados |
| Schema Workspace/User/Membership | ✅ exatamente três modelos |
| Migration | ✅ SQL gerado e aplicado via migrate deploy |
| Repositório escopado por workspaceId | ✅ todas as consultas/mutações Workspace/Membership usam scope |
| Migration aplica em Postgres efêmero | ✅ cluster novo PostgreSQL17.10; aplicação/reaplicação/status PASS |
| Teste de isolamento A≠B | ✅ 12 testes integração, incluindo adversariais cruzados |
| Testes integração obrigatórios doc29 | ✅ persistência real; sem mock/skip |
| Android/contrato preservados | ✅ comparação SHA-256; nenhuma mudança autorizada/feita |
| Regressão backend exigida | ✅ test/typecheck/lint/build/audit finais |
| Documentação diretamente afetada | ✅ README, entrada, inventário, domínio, stack, testes, changelog e este relatório |
| Fora de escopo | ✅ nada de WP-103+, endpoints, auth, enrollment, trial, heartbeat, painel, FCM, localização, eventos, comandos, MDM |
| Parada: isolamento provado por teste | ✅ WP-102 encerrado; WP-103 NÃO INICIADO |

## 10. Higiene

Nenhum .env real/segredo adicionado. Credenciais efêmeras removidas. .env.example só comentários seguros. node_modules/dist/src/generated ignorados por Git, build artifacts não versionados. Scripts de execução temporários removidos; runner permanente documentado em scripts/. Relatório WP-101/históricos preservados; nenhum commit, deploy ou mudança de serviço existente.

## 11. Próximo pacote (informação, não execução)

WP-103 — Auth humana (register/login), conforme codex-work-packages.md. NÃO iniciado. PARE.

## 12. Lista completa de arquivos desta rodada

Gerada pela comparação de hashes antes/depois, acrescentada após validação final.

### Criados (12)

- `docs/architecture/wp-102-persistence-report.md`
- `services/api/jest.integration.config.cjs`
- `services/api/prisma.config.ts`
- `services/api/prisma/migrations/20260912000100_workspace_base/migration.sql`
- `services/api/prisma/migrations/migration_lock.toml`
- `services/api/prisma/schema.prisma`
- `services/api/scripts/test-postgres.mjs`
- `services/api/src/modules/workspaces/workspace.database.ts`
- `services/api/src/modules/workspaces/workspace.repository.ts`
- `services/api/src/modules/workspaces/workspaces.module.ts`
- `services/api/test/workspace-config.spec.ts`
- `services/api/test/workspaces.integration.spec.ts`

### Alterados (19)

- `docs/architecture/11-inventario-estado-real.md`
- `docs/architecture/21-dominio-erd-tenancy.md`
- `docs/architecture/24-backend-stack.md`
- `docs/architecture/29-estrategia-testes.md`
- `docs/architecture/CODEX-START-HERE.md`
- `docs/architecture/architecture-changelog.md`
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
- `services/api/src/shared/config/environment.ts`

### Removidos

Nenhum arquivo preexistente removido. Apenas auxiliares temporários desta execução foram descartados.

### Integridade verificada

Arquivos de Android e contratos comparados por SHA-256: todos intactos. OpenAPI: `1156eda65d0fb43770cba8025f9a8a17b0962f7ec7027638d10d13438e099c8f`. ADR registry e definição do WP não alterados.
