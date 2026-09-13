# Changelog arquitetural — NextGuardian

Registro por rodada. Mais recente no topo.

## Rodada 7 — WP-102 persistência base (2026-09-12)

Escopo literal confirmado no WP vigente: Postgres/Prisma, schema Workspace/User/Membership, migration, repositório escopado por workspaceId, integração A≠B. Stack e ADRs ACEITOS obedecidos, sem decisão de produto reaberta.

Migration `20260912000100_workspace_base` aplicada/reaplicada em PostgreSQL 17.10 efêmero; status sem pendência. Isolamento: 12 testes reais PASS; regressão/config/HTTP: 14 testes PASS; typecheck/lint/build PASS; npm audit --omit=dev: 0 vulnerabilidades. Docker indisponível; binários locais em cluster independente. Tentativa inicial do runner Windows corrigida (pipes herdados de pg_ctl); resíduo temporário removido depois de confirmar processo encerrado. Serviço PostgreSQL pré-existente preservado.

Prisma 7.10 estável, sem adotar 8 RC; correções transitivas deepmerge-ts 8.0.2/mysql2 3.24.4. Só glue de build/config/módulo/testes necessário à persistência; sem endpoints. Android/contrato WP-001 preservados por hashes. `_wp101*` temporários ausentes no preflight. [Relatório completo](wp-102-persistence-report.md). WP-103 NÃO INICIADO. Parado ao cumprir WP-102.


## Rodada 6 — WP-101 bootstrap backend (2026-09-12)

Exclusivamente services/api: NestJS 12/TypeScript 5.9 ESM, health, env Zod/dotenv, pino e requestId/correlationId, Dockerfile, Jest/supertest. ADR-0003 Workspace e ADR-0012 stack confirmados pela autorização explícita do pacote. Nenhuma decisão de marca/perfil reaberta. PostgreSQL/Prisma permanecem posteriores.

Build/typecheck/lint PASS; 11 testes em 2 suites PASS; processo compilado retornou /health 200; env inválido rejeitado. Audit runtime final: 0 vulnerabilidades (override Multer 2.3.0). Docker daemon indisponível: container não testado. Android e contracts: 62 arquivos comparados por SHA-256, sem mudanças. OpenAPI WP-001 preservado.

Corrigidas referências documentais WP-001→WP-101; ajustada compatibilidade ESM/Nest e ferramentas. [Relatório completo e aceite](wp-101-bootstrap-report.md). WP-102 NÃO INICIADO. Trabalho parado.


## Rodada 12 — Event platform + Command Center (Core) (2026-09-13)

**Backend (`services/api`):** plataforma de eventos e centro de comandos (Core, fases 3+4 sem FCM — entrega por poll autenticado).
- **Modelo:** `Event` (append-only, taxonomia) e `Command` (catálogo fechado, ciclo de vida, expiração) + enums; migração `20260913000200_events_commands`.
- **Endpoints (6):** `GET /events`, `GET /devices/{id}/events` (timeline); `POST/GET /devices/{id}/commands` (console); `GET /agent/commands`, `POST /agent/commands/{id}/ack` (agente). Contrato OpenAPI em **18 paths**.
- **Comandos:** catálogo `REQUEST_CHECKIN/SYNC_NOW/SHOW_MESSAGE/RING_DEVICE/REFRESH_DEVICE_INFO`; QUEUED→DELIVERED (no fetch)→EXECUTED/FAILED (no ack); expiração; **sem execução arbitrária**. Eventos emitidos no enrollment/revoke e no ciclo do comando.
- **Verificado:** typecheck/lint/build + contrato; **30 testes de integração** (12 workspace + 10 enrollment + 4 console + **4 eventos/comandos**), com isolamento por workspace.

**Web (`apps/web-admin`):** detalhe do dispositivo ganhou **Timeline** (eventos) e **Comandos** (lista + botões: check-in, sync, tocar, atualizar info, mensagem). `npm run build` verde.

**Cobre:** event platform + command center (Core). FCM fica para quando houver projeto Firebase; hoje o agente busca por poll (`GET /agent/commands`).

## Rodada 11 — WP-201: console web + API de conta (2026-09-13)

**Backend (`services/api`):** novos endpoints escopados por conta para o console — `GET /account/me` (workspace/usuário/contagem de dispositivos), `GET /devices` (lista do workspace), `POST /activation/codes` (emitir código). Contrato OpenAPI atualizado (13 paths; validador ajustado). CORS habilitado (Bearer, sem cookies). Guard de conta reutilizado; isolamento por workspace mantido. **26 testes de integração** (12 workspace + 10 enrollment + **4 console**), 19 unit, typecheck/lint/contrato verdes.

**Web (`apps/web-admin`):** console operacional em **Next.js (App Router) + TypeScript + Tailwind**, na **porta 3001** (backend na 3000 — apenas duas portas). Telas: login/registro, visão geral (contadores + assinatura), dispositivos (lista + detalhe com revogação), vínculo (emitir código de ativação), assinatura, configurações. Cliente de API com Bearer; presença derivada de `lastSync`. **`npm install` + `npm run build` verdes** (9 rotas, tipos válidos).

**Segurança:** `postcss` direto atualizado para versão corrigida; resta advisory de build no `postcss` empacotado pelo Next (dev-only, baixo risco; sai com upgrade major do Next). Nenhum segredo commitado.

**Cobre:** WP-201 + API de conta. Estrutura web pronta.

## Rodada 10 — WP-301: agente Android ↔ API real (2026-09-13)

**Implementado (atrás da flag `USE_REAL_API`, default false → mock preservado):**
- `core/network`: JSON puro (parser/encoder sem dependências), `HttpClient`/`JdkHttpClient` (HttpURLConnection), `NexGuardianApi` (chamadas tipadas do contrato), `RemoteStateStore` + `DataStoreRemoteStateStore`.
- `data/RemoteActivationRepository`: implementa a **mesma porta** `ActivationRepository`, orquestrando validate → pair → confirm → heartbeat → revoke contra a API real; domínio e telas **inalterados**.
- Manifesto: permissão `INTERNET` + `network_security_config` (cleartext só para hosts de dev: 10.0.2.2/localhost); `usesCleartextTraffic=false` mantido. BuildConfig `USE_REAL_API`/`API_BASE_URL`. Fiação por flag em `NexGuardianApplication`.

**Verificação:** sem novas dependências; **26 testes unitários JVM** (14 domínio + 5 JSON + 4 API + 3 repositório real), `assembleDebug` (APK monta) e `lintDebug` verdes. Testes instrumentados (emulador) não executados neste ambiente.

**Nota:** tokens ficam em DataStore app-privado (backup desabilitado) como interim; proteção via Keystore é hardening planejado (docs 18/22). Distinção INVALID/EXPIRED da ativação simplificada para INVALID no cliente (servidor retorna 400 para ambos) — melhoria futura com código de erro no contrato.

**Cobre:** WP-301. Próximo: WP-201 (console operacional web).

## Rodada 9 — Implementação do backend Core (MVP) (2026-09-13)

**Pedido:** começar a implantação forte e deixar a estrutura pronta (repo/commit depois).

**Implementado em `services/api` (real, testado):**
- **Modelo de dados** ampliado: Session, Plan, Subscription, ActivationCode, Device, Pairing, DeviceSession (+ enums), com migração `20260913000100_enrollment_core` gerada pelo Prisma e aplicada em PostgreSQL real.
- **Infra compartilhada:** provider de banco global, crypto (scrypt para senha, tokens opacos com hash SHA-256, código de ativação typeable), durações/TTLs, guards de sessão (conta/dispositivo), validação Zod nas bordas, serializadores do contrato.
- **Os 10 endpoints do OpenAPI implementados:** `/auth/register`, `/auth/login`, `/activation/validate`, `/devices/pair`, `/devices/pair/confirm`, `/devices/session/refresh`, `/devices/heartbeat`, `/devices/revoke`, `/devices/me`, `/subscription/me`.
- **Regras-chave:** senha só como hash; tokens só como hash (raw devolvido uma vez); trial transacional **uma vez por workspace**; rotação de refresh com **detecção de replay**; **isolamento por workspace** aplicado; servidor como autoridade temporal.

**Cobre os WPs:** WP-103 (auth), WP-104 (device/enrollment/activation), WP-105 (trial/entitlements). Falta: WP-201 (console operacional), WP-301 (integração do agente Android com a API real).

**Verificação:** typecheck limpo; **19 testes unitários** (config, http/logging, crypto); **22 testes de integração** contra PostgreSQL 17 efêmero (12 isolamento de workspace + 10 fluxo de enrollment ponta-a-ponta); build e lint OK. Sem segredos em log.

**Pendente:** criar repositório Git + primeiro commit (a fazer a seguir, a pedido do usuário).

## Rodada 8 — Arquivamento da arquitetura anterior + limpeza (2026-09-13)

**Pedido:** separar em duas pastas. Preservar (sem apagar) a arquitetura anterior num arquivo resumível; deixar na pasta ativa apenas o que serve à nova proposta, sem nenhuma referência a APK de terceiros.

**Feito:**
- **Backup completo** do projeto copiado para `C:/Users/Root/Documents/NextGuardian` (renomeada para `NextGuardian-spy`), excluindo apenas caches regeneráveis (`node_modules`, `.gradle`, `build`, `.tools`). Contém tudo, inclusive o material de análise anterior — resumível.
- **Pasta ativa `nexguardian` limpa:** removido o material de análise anterior e os docs de arquitetura antiga (00/01/02); removida a `feature-master-matrix.md` (superada pelo [doc 36](36-catalogo-funcionalidades.md)); higienizadas as referências a artefatos de terceiros em ~13 documentos (reescritas como "greenfield"/"desenho próprio"), mantendo os guardrails legítimos (consentimento, transparência, sem captura clandestina).
- Verificação: varredura confirma zero referências ao APK de terceiros na pasta ativa.

**Sem alteração de código do produto.** O app implementado segue com zero permissões/APIs sensíveis.

## Rodada 7 — Catálogo mestre + ponto competitivo (2026-09-13)

**Pedido:** listar todas as funcionalidades (super-admin, tenant, apps); revisar o que dos itens originais é incorporável sem risco de bloqueio; deixar o ponto melhor que o mercado (pesquisa); salvar para começar a implantar.

**Pesquisa de mercado (ponto):** benchmark de apps líderes — facial+liveness, geofencing, offline, banco de horas/escalas, espelho+AFD/AEJ, ajustes/abonos com aprovação, integração folha. Fontes registradas nos docs 35/36.

**Revisão de incorporação:** classificados como INCORPORÁVEIS (consentidos/Play-OK) localização, geofence, inventário, uso de apps/tempo de tela (UsageStats), limites/bloqueio de apps, MDM (DO/PO), push, ponto com facial on-device, MediaProjection consentida (condicional), filtro de conteúdo (futuro). EXCLUÍDOS (bloqueio): SMS/call log/contatos, notification listener, accessibility de captura, câmera/mic ocultos, gravação de chamada, keylogger, root, ocultação.

**Criado:** [36-catalogo-funcionalidades.md](36-catalogo-funcionalidades.md) — catálogo mestre para implementação.
**Atualizados:** doc 35 (diferenciais competitivos + fontes), doc 10 (índice), este changelog.

**Verificação de segurança:** confirmado por inspeção que o app implementado hoje tem **zero permissões e zero APIs sensíveis**. Nada implementado bloqueia app/conta/Play.

## Rodada 6 — Escopo Business/MDM (controles de gestão + ponto) (2026-09-13)

**Contexto:** proprietário confirmou perfil Business com aparelho corporativo **divulgado/consentido** (funcionário sabe que é da empresa, uso relacionado ao trabalho, só a empresa modifica) e pediu: bloquear (des)instalação de apps, impedir factory reset, impedir modificações não autorizadas, console web de controle, SaaS multi-tenant (empresas = tenants) e **ponto eletrônico com localização**.

**Análise:** todos legítimos (gestão de dispositivo corporativo gerenciado), **CONDICIONAIS a Device/Profile Owner** com provisioning e divulgação — não clandestinos. SaaS multi-tenant já modelado (Workspace BUSINESS; isolamento provado no WP-102). Ponto eletrônico é viável e regulado (Portaria MTP 671/2021, modalidade REP-P: AFD, comprovante, imutabilidade) — conformidade a validar com especialista.

**Documentos criados:** [34-business-mdm-controles.md](34-business-mdm-controles.md) (controles + console de frota), [35-ponto-eletronico.md](35-ponto-eletronico.md).
**Atualizados:** doc 13 (perfil Business + matriz), doc 19 (Parte III: 4 controles + ponto classificados como CONDICIONAL por eixo), doc 10 (índice), este changelog.
**Sem código.** Trilha Business permanece posterior ao MVP Family (ADR-0014).

## Rodada 5 — Execução do WP-001 (saneamento do contrato) (2026-09-12)

**Escopo:** exclusivamente WP-001. Sem backend, Android ou Firebase. WP-101 não iniciado.

**Verificação de encoding:** o `openapi.json` **já estava em UTF-8 correto** (0 bytes `C3 83`; descrições com acentuação correta). A divergência D8 ("mojibake") era **falso positivo** da rodada 3, causado por leitura sem `encoding="utf-8"` no Windows (cp1252). **Nenhum byte alterado por encoding.**

**Alterações no contrato (`packages/contracts/openapi.json`):**
1. `Idempotency-Key` (header `required`, uuid) adicionada a `/activation/validate` — único mutador que faltava; passa a haver cobertura em register/activation-validate/pair/pair-confirm/heartbeat/revoke.
2. Escopo de workspace formalizado nas descrições de `accountBearer` e `deviceBearer`: isolamento (accountId → Workspace do domínio, ADR-0003) transportado como **claim no token**; nenhum endpoint aceita id de conta/workspace por query/path. Sem renomear `accountId`, sem mecanismo paralelo de tenancy.

**Preservado (não mudou):** os 10 paths; schemas; `securitySchemes` (só descrições enriquecidas); demais `Idempotency-Key`; código Android; nenhum applicationId/namespace/rootProject renomeado.

**Validação:** `PYTHONPATH=.tools/contract-validator python packages/contracts/validate_contract.py` → `PASS` (EXIT_CODE=0): OpenAPI 3.1 válido + 4 casos de heartbeat + `len(paths)==10`. JSON bem-formado.

**Docs atualizados:** doc 25 (§1 encoding resolvido, §3 achados), doc 11 (D8 falso positivo), este changelog.

**Divergências deixadas para depois (fora do WP-001):** `/activation/validate` anônimo vs. ator "conta autenticada" → WP-104; prova de posse (Keystore) → doc 22; ADR-0003/0012 a confirmar no kickoff do WP-101.

**Estado:** critérios de aceite do WP-001 atendidos. PARADO antes do WP-101.

## Rodada 4 — Decisões de produto (marca + perfil) (2026-09-12)

**Decisões do proprietário registradas:**
- **ADR-0001 → ACEITA (opção A):** marca comercial `NextGuardian`; identificadores técnicos `nexguardian` mantidos (`com.nexguardian.agent`, `rootProject.name = NexGuardianAgent`); **sem renomeação técnica**.
- **ADR-0014 → ACEITA (nova):** perfil inicial do MVP = **Family/Responsible**; Business/MDM permanece posterior sobre o mesmo Core, sem duplicar backend.

**Documentos atualizados:** doc 20 (ADR-0001 ACEITA + ADR-0014 nova), doc 19 (pergunta 4b resolvida), implementation-roadmap (Fase 0 reduzida a saneamento; trilhas Family=MVP / Business=posterior), codex-work-packages (WP-001 revisado para saneamento documental/contratual), CODEX-START-HERE (§5/6/7), este changelog.

**Impacto no roadmap:** Fase 0 deixou de ter decisão pendente de marca/perfil; virou saneamento leve (encoding + formalização de contrato) executável antes do WP-101.

**Conclusão sobre WP-001:** continua necessário, mas **reduzido** — é agora saneamento documental/contratual rápido (não bloqueante por decisões de produto), executável imediatamente antes do WP-101. Nenhum código alterado.

## Rodada 3 — Consolidação gigante (2026-09-11)

**Documentos lidos:** documentação da arquitetura anterior; `android-foundation-build.md`; `openapi.json`; código Android (`settings/app/root build.gradle.kts`, `gradle.properties`, `domain/Models.kt`, `Ports.kt`, `MockActivationRepository`, `PreferencesSessionStore`, `DeviceCredentialStore`, `Heartbeat`, `BackgroundScheduler`, manifesto, res/xml, testes); docs 10–19 e matrizes existentes.

**Confirmado no código:** um módulo Gradle `:app` (root `NexGuardianAgent`); Kotlin embutido no AGP 9; minSdk26/compile37/target37; deps sem Retrofit/Firebase/DI; DataStore real; Keystore só verifica alias; WorkManager desabilitado; heartbeat mock envia bateria `null`/rede `UNKNOWN`; sem INTERNET/cleartext; backup exclui tudo; sem CI; git sem commits.

**Errado/desatualizado na doc:** "módulos" (é módulo único); marca em 3 grafias; heartbeat tratado como componente (é mock); contrato vs mock divergem (battery/network); `uppercase()` só no mock; mojibake no OpenAPI; `ConnectionState` como 1ª classe vs presença derivada. Registrado em [doc 11 §8](11-inventario-estado-real.md).

**Documentos criados:** 13 (Core+perfis, criado na rodada 2, referenciado), 20 (ADRs), 21 (domínio/ERD/tenancy), 22 (auth), 23 (trial/entitlements), 24 (backend stack), 25 (OpenAPI audit), 26 (FCM), 27 (consentimento), 28 (observabilidade), 29 (testes), 30 (CI/CD), 31 (UX agente), 32 (produtos ref.), 33 (console mínimo), codex-work-packages, CODEX-START-HERE, claude-research-backlog, este changelog.

**Documentos atualizados:** 10 (índice), 11 (auditoria profunda + divergências + legenda), 12 (eixos ampliados + heartbeat spec + sequências), 14 (volume), 15 (lifecycle de comando), 16 (pipeline policy→risco + geofence círculo), 18 (STRIDE detalhado), android-capability-matrix (20 dimensões), feature-master-matrix (perfil + aceite), implementation-roadmap (Fase 0 + trilhas).

**Descobertas:** conta demo é "Família de demonstração" (aponta Family como perfil natural de MVP); backup/data-extraction já privacy-forward; toolchain moderna e coerente.

**Decisões mantidas:** ADR-0004 (servidor autoridade), 0005 (DeviceState derivado), 0006 (heartbeat), 0007 (FCM sinal), 0008 (catálogo fechado), 0009 (greenfield), 0013 (preservar fundação).

**Decisões alteradas/novas:** premissa B2B descartada → ADR-0002 (Core+perfis); ADR-0011 (entitlements configuráveis); ADR-0003 (tenancy neutra, proposta); ADR-0010 (auth humana≠agente); ADR-0012 (stack, proposta).

**Pendentes do produto:** ADR-0001 (marca); perfil de MVP (pergunta 4b); provedor de pagamento; verificação de e-mail/antifraude; validação LGPD.

**Impacto no roadmap:** adicionada Fase 0 (saneamento) e Fase 1B (console mínimo); trilhas Family e Business como transversais.

**Handoff para Codex:** [CODEX-START-HERE.md](CODEX-START-HERE.md) + [codex-work-packages.md](codex-work-packages.md). Primeiro WP: WP-001 (Fase 0). Nenhum código alterado nesta rodada.

## Rodada 2 — Correção do modelo de produto (2026-09-11)
Criado doc 13 (Core+perfis); doc 19 Parte III reclassificada por eixos; roadmap ganhou console mínimo; pergunta parental-vs-MDM resolvida.

## Rodada 1 — Consolidação inicial (2026-09-11)
Criados docs 10–19 + feature-master-matrix + android-capability-matrix + implementation-roadmap. Inventário, matrizes, DeviceState/heartbeat, eventos, comandos, localização/risco, painel, threat model, decisões. Sem código.
