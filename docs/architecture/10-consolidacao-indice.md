# Consolidação arquitetural — índice da rodada

Data: 2026-09-11. Entrada única desta rodada de **análise, consolidação e planejamento**. Nenhuma implementação foi feita. Nenhum relatório anterior foi apagado ou sobrescrito.

## Objetivo

Descobrir **qual deve ser a arquitetura completa do NextGuardian antes de continuar implementando**, aproveitando tudo que já existe, mantendo separado o comprovado, o inferido, o desconhecido, o nosso e o que é só possibilidade futura.

## Documentos por categoria

**Estado atual**
- [11 — Inventário do estado real](11-inventario-estado-real.md) — o que existe/mock/contrato/planejado/ausente; auditoria profunda; divergências doc×código; legenda de evidências.
- [architecture-changelog](architecture-changelog.md) — histórico por rodada.

**Produto**
- [13 — Core + perfis](13-modelo-produto-core-perfis.md) — Core único + Family/Responsible e Business/MDM.
- [23 — Trial e Entitlements](23-trial-entitlements.md) — planos/limites/trial configuráveis.
- [36 — Catálogo de funcionalidades](36-catalogo-funcionalidades.md) — capacidades por perfil e por superfície (referência de implementação).

**Android**
- [android-capability-matrix](android-capability-matrix.md) — 12→20 dimensões; o que é distribuível.
- [31 — UX do agente](31-ux-agente.md).

**Domínio**
- [21 — Domínio, ERD, Tenancy](21-dominio-erd-tenancy.md).
- [12 — DeviceState e Heartbeat](12-devicestate-heartbeat.md) — eixos + spec executável.

**Backend / API**
- [24 — Backend stack](24-backend-stack.md) · [25 — Auditoria OpenAPI](25-openapi-audit.md) · [22 — Autenticação](22-autenticacao.md).

**Comunicação do dispositivo**
- [12 — Heartbeat](12-devicestate-heartbeat.md) · [26 — FCM](26-fcm-arquitetura.md).

**Eventos / Comandos**
- [14 — Eventos e Timeline](14-eventos-timeline.md) · [15 — Regras e Command Center](15-motor-regras-comandos.md).

**Localização / Policy / Risco**
- [16 — Localização, Inventário, Risco](16-localizacao-inventario-risco.md).

**Segurança / LGPD**
- [18 — Segurança, Privacidade, Threat Model](18-seguranca-privacidade-threat-model.md) · [27 — Consentimento versionado](27-consentimento-versionado.md).

**UI / Painel**
- [33 — Painel operacional mínimo (1B)](33-painel-operacional-minimo.md) · [17 — Painel completo (Fase 7)](17-painel-web.md).

**Business / MDM**
- [34 — Controles de gestão + console de frota](34-business-mdm-controles.md) · [35 — Ponto eletrônico (REP-P)](35-ponto-eletronico.md).

**Catálogo mestre**
- [36 — Catálogo completo de funcionalidades](36-catalogo-funcionalidades.md) — referência para implementação (super-admin, tenant, apps, ponto; itens incorporáveis × excluídos).

**Operação**
- [28 — Observabilidade](28-observabilidade.md) · [29 — Estratégia de testes](29-estrategia-testes.md) · [30 — CI/CD mínimo](30-cicd-minimo.md).

**Roadmap / Decisões**
- [implementation-roadmap](implementation-roadmap.md) — Fases 0, 1A, 1B, 2–7 + trilhas Family/Business.
- [20 — Registro de ADRs](20-adr-registry.md) · [19 — Decisões, Perguntas, NÃO implementar](19-decisoes-perguntas-nao-implementar.md).

**Codex handoff**
- [CODEX-START-HERE](CODEX-START-HERE.md) · [codex-work-packages](codex-work-packages.md).

**Pesquisa do Claude**
- [claude-research-backlog](claude-research-backlog.md).

**Referências externas**
- [32 — Produtos de referência](32-produtos-referencia.md).

Correspondência com os 14 entregáveis da rodada 1: (1) doc 11; (2) doc 36 (catálogo); (3) android-capability-matrix; (4) doc 12 §1 + docs 13/21; (5) doc 14; (6) doc 15; (7) doc 12 §3; (8) doc 12 §2; (9) doc 17/33; (10) doc 18 §4b; (11) roadmap; (12) docs 19 I + 20; (13) doc 19 II; (14) doc 19 III.

## Sumário executivo

- **O que já existe é bom e deve ser preservado:** um agente Android compilável e testado + contratos OpenAPI + um domínio limpo. **A maior lacuna é a ausência de backend real** — hoje ativação, trial, heartbeat, autenticação e assinatura são **simulados**.
- **A arquitetura-alvo** é de gestão de dispositivos **consentida, transparente e auditável** (device state rico, timeline de eventos, command center de catálogo fechado, políticas/risco, painel multi-tenant) — o oposto de vigilância clandestina.
- **Produto não travado em um mercado:** um **NextGuardian Core** único com perfis **Family/Responsible** e **Business/MDM** sobre ele, sem duplicar backend ([doc 13](13-modelo-produto-core-perfis.md)). Trial, limites e pagamento são **dado configurável**, decididos depois.
- **Capacidades sensíveis classificadas individualmente** (impossibilidade técnica × API × Play × permissão × papel × DO/PO × consentimento × decisão de produto), não como um rótulo genérico — [doc 19, Parte III](19-decisoes-perguntas-nao-implementar.md).
- **Ordem racional:** backend Core primeiro (fase 1) → painel operacional mínimo (1B) → device state → eventos → comandos → localização → políticas/risco → painel completo.

## Divergências encontradas entre documentação e código

1. **Nomenclatura NextGuardian vs. NexGuardian.** README/`00-fundacao` afirmam usar "nexguardian" (minúsculo, sem "t"); o `applicationId` e o namespace de código são `com.nexguardian.agent`. O usuário se refere ao projeto como **NextGuardian**. Divergência de marca a resolver (nome comercial vs. identificador técnico). Não altera código nesta rodada.
2. **Grupos "arquiteturais" apresentados como módulos.** Relatórios falam em módulos `core/*`, `feature/*`, `service/*`; na prática há **um único módulo Gradle `:app`** com pastas de fontes. Correto no README do app, mas fácil de ler errado nos relatórios de RE.
3. **`core/network`, `core/realtime`, `feature/permissions`, `service/messaging`** aparecem como parte da arquitetura, mas estão **vazios de lógica** (planejados). Não confundir reserva com implementação.
4. **Heartbeat "implementado".** Existe `Heartbeat.kt`, porém é **mock sem rede e sem agendamento** (WorkManager desabilitado no manifesto). O relatório de build deixa claro; a matriz aqui reforça o estado SIMULADO.
5. **`openapi.json` com acentuação corrompida** (mojibake de duplo encode em várias `description`, ex.: "negÃ³cio"). É defeito de dados no contrato, não de lógica — corrigir em rodada de implementação, não agora.
6. **`ConnectionState` no domínio** sugere que conectividade é um estado de primeira classe; a arquitetura-alvo trata presença como **derivada** de `lastSeen`/`lastHeartbeat` (doc 12). Alinhar quando o device state real for construído.

Nenhuma dessas divergências exige refação da fundação; são pontos de alinhamento para a próxima etapa.

## Ordem recomendada para a próxima etapa

1. Decidir apenas o que resta bloqueante: qual perfil lança primeiro no MVP e seu conjunto mínimo de capacidades (pergunta 4b). Parental-vs-MDM já **resolvida** (Core + perfis, AD-15); trial/limites/pagamento são configuráveis e adiáveis (AD-16).
2. Resolver a divergência de marca NextGuardian/NexGuardian antes de expor endpoints/painel.
3. Iniciar a **Fase 1A (backend Core mínimo)** — auth, tenant (`profile`), device, enrollment, ativação e trial configurável — substituindo o mock do agente, seguida do **painel operacional mínimo (1B)**. Escopo enxuto, para evitar implementar "tudo de uma vez".

**PARE aqui.** Esta rodada é de entendimento. O roadmap não deve ser executado automaticamente; a próxima etapa começa apenas com aprovação explícita.
