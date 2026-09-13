# Work Packages para o Codex — NextGuardian

Data: 2026-09-11. Unidades **pequenas, compiláveis e testáveis**. **Não** executar aqui — o Codex executa sob autorização separada, um WP por vez. Dependências reais, não ordem cega.

Formato de cada WP: Objetivo · Por que agora · Pré-requisitos · Documentos autoritativos · Ler · Pode alterar · Não alterar · Implementação · Fora de escopo · Critérios de aceite · Testes · Doc a atualizar · Riscos · PARE quando.

Convenção: WPs `0xx` = saneamento/decisão; `1xx` = backend Core (Fase 1A); `2xx` = painel mínimo (1B); `3xx` = integração Android real. Backend proposto: Node/TS/NestJS/Postgres/Prisma/Zod (doc 24, ADR-0012 — confirmar antes do WP-101).

---

## WP-001 — Saneamento documental/contratual (Fase 0)
> Marca (ADR-0001, opção A) e perfil de MVP (ADR-0014, Family) já **ACEITAS** em 2026-09-12. **Não** há decisão de marca/perfil neste WP e **não** se renomeia código. WP-001 virou um saneamento leve, executável rapidamente antes do WP-101.
- **Objetivo:** corrigir mojibake do `openapi.json`; formalizar no contrato `Idempotency-Key` (header) e **escopo de workspace no token** (claim); registrar/confirmar ADR-0003 (tenancy) e ADR-0012 (stack) — estes dois podem ser confirmados no kickoff do WP-101.
- **Por que agora:** encoding e lacunas de contrato afetam quem consome a API; baratos de resolver antes do backend.
- **Pré-requisitos:** nenhum (decisões de produto já tomadas).
- **Documentos autoritativos:** [doc 20](20-adr-registry.md), [doc 25](25-openapi-audit.md), [doc 21](21-dominio-erd-tenancy.md).
- **Ler:** doc 11 §8, doc 25.
- **Pode alterar:** `packages/contracts/openapi.json` (descrições/encoding + `Idempotency-Key`/escopo), docs de ADR.
- **Não alterar:** código Android; `applicationId`/namespace/`rootProject.name` (permanecem `nexguardian` por ADR-0001).
- **Implementação:** reescrever descrições em UTF-8; adicionar header de idempotência e claim de workspace ao contrato; confirmar ADRs pendentes.
- **Fora de escopo:** qualquer renomeação técnica de marca; endpoints novos de negócio.
- **Critérios de aceite:** `validate_contract.py` passa; nenhuma `description` com mojibake; contrato expõe `Idempotency-Key` e escopo de workspace.
- **Testes:** `python packages/contracts/validate_contract.py`.
- **Doc a atualizar:** doc 25, doc 20, changelog.
- **Riscos:** baixos; apenas garantir que o mock Android continua válido contra o contrato.
- **PARE quando:** contrato limpo/formalizado e ADRs pendentes confirmados.

## WP-101 — Bootstrap backend (`services/api`)
- **Objetivo:** projeto backend mínimo que sobe (health check), com stack do doc 24.
- **Por que agora:** base de tudo; hoje `services/` vazio.
- **Pré-requisitos:** ADR-0012 aprovado (WP-001).
- **Documentos:** [doc 24](24-backend-stack.md), [doc 28](28-observabilidade.md), [doc 30](30-cicd-minimo.md).
- **Ler:** doc 24, doc 21.
- **Pode alterar:** criar `services/api/**`, `docker-compose` (Postgres dev).
- **Não alterar:** `apps/android-agent`, contratos.
- **Implementação:** app NestJS/TS, `/health`, config via env validado (Zod), logs pino (requestId), Dockerfile.
- **Fora de escopo:** endpoints de negócio, banco.
- **Critérios de aceite:** `npm test` verde; `/health` 200; typecheck/lint ok.
- **Testes:** unit do health; supertest.
- **Doc a atualizar:** doc 24 (status→IMPLEMENTADO parcial), changelog.
- **Riscos:** over-engineering — manter monólito modular.
- **PARE quando:** servidor sobe e testes passam.

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

## WP-103 — Auth humana (register/login)
- **Objetivo:** `POST /auth/register`, `/auth/login` conforme contrato.
- **Pré-requisitos:** WP-102.
- **Documentos:** [doc 22](22-autenticacao.md) §1, [doc 25](25-openapi-audit.md).
- **Implementação:** hash forte, JWT (audiência human, claim workspaceId), refresh rotacionado, rate limit.
- **Critérios de aceite:** contrato validado; 409 duplicado; refresh replay invalida família.
- **Testes:** API contract + replay.
- **PARE quando:** login/refresh cobertos por teste.

## WP-104 — Device + Enrollment + Activation
- **Objetivo:** `activation/validate`, `devices/pair`, `pair/confirm` reais; `Device`/`Installation`/`Enrollment`.
- **Pré-requisitos:** WP-103.
- **Documentos:** [doc 21](21-dominio-erd-tenancy.md), [doc 25](25-openapi-audit.md).
- **Implementação:** código uso único/expira/atômico; Idempotency-Key; estados de vínculo (espelham `PairingTransitions`).
- **Critérios de aceite:** retry não duplica device/trial; código expirado/consumido não vincula; isolamento mantido.
- **Testes:** idempotência, expiração, isolamento.
- **PARE quando:** enrollment real testado.

## WP-105 — Trial/entitlements configuráveis
- **Objetivo:** `Plan`/`Subscription`/`Entitlement`; `subscription/me`; trial transacional configurável.
- **Pré-requisitos:** WP-104.
- **Documentos:** [doc 23](23-trial-entitlements.md).
- **Implementação:** trialDurationHours/deviceLimit como dado; grava trialStartedAt 1x/workspace.
- **Critérios de aceite:** reinstalar/novo código não reinicia trial; deviceLimit bloqueia excedente.
- **Testes:** clock skew, reinstalação, limite.
- **PARE quando:** trial/limite testados.

## WP-301 — Agente consome ativação real (substituir mock)
- **Objetivo:** trocar `MockActivationRepository` por cliente HTTP real (só activation/pair/confirm), atrás da porta `ActivationRepository`.
- **Por que agora:** primeira integração fim-a-fim; corta a maior simulação.
- **Pré-requisitos:** WP-104 (+105 para trial).
- **Documentos:** [doc 22](22-autenticacao.md), [doc 25](25-openapi-audit.md), README do agente.
- **Ler:** `data/MockActivationRepository.kt`, `domain/Ports.kt`.
- **Pode alterar:** `apps/android-agent/core/network` (novo cliente), `data` (impl real), manifesto (INTERNET), `network_security_config`.
- **Não alterar:** `domain` (portas/estados), fluxo de telas.
- **Implementação:** cliente HTTP (decisão de lib no WP), mapear DTO↔domínio, manter mock atrás de flag para testes.
- **Fora de escopo:** heartbeat/FCM/comandos.
- **Critérios de aceite:** build+testes verdes; fluxo Welcome→Status funciona contra backend local; sem quebrar testes existentes.
- **Testes:** unit de mapeamento; instrumentado do fluxo; manter `ActivationDomainTest`/`ActivationNavigationTest`.
- **Doc a atualizar:** doc 11 (estado), README agente, changelog.
- **Riscos:** regressão de testes existentes; INTERNET/cleartext.
- **PARE quando:** integração activation real testada; heartbeat ainda mock.

## WP-201 — Console operacional mínimo
- **Objetivo:** painel enxuto (login, devices, enrollment, activation, subscription).
- **Pré-requisitos:** WP-103..105.
- **Documentos:** [doc 33](33-painel-operacional-minimo.md).
- **Critérios de aceite:** login + listar devices do workspace; escopo por workspace; mock rotulado.
- **PARE quando:** operação básica visível sem Swagger.

---

## Fila recomendada e dependências
```
WP-001 → WP-101 → WP-102 → WP-103 → WP-104 → WP-105 → WP-301
                                   └→ WP-201 (após 103..105)
```
Fases 2+ (heartbeat/eventos/comandos/localização) geram novos WPs **após** a 1A/1B fecharem. Não criar esses WPs agora.
