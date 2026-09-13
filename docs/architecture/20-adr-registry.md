# Registro de ADRs — NextGuardian

Data: 2026-09-11. Decisões arquiteturais formais. Status: **PROPOSTA · ACEITA · PENDENTE DO PRODUTO · SUBSTITUÍDA**.
Nada é marcado ACEITA sem decisão do proprietário. ADRs que só o Claude/arquiteto pode fixar tecnicamente (sem escolha comercial) podem ser ACEITA quando forem consequência direta de restrições já validadas.

| ADR | Título | Status |
| --- | --- | --- |
| ADR-0001 | Marca NextGuardian vs. identificadores `nexguardian` | **ACEITA** (opção A) |
| ADR-0002 | Core + perfis (Family/Business) sobre backend único | ACEITA |
| ADR-0014 | Perfil inicial do MVP = Family/Responsible | **ACEITA** |
| ADR-0003 | Tenancy: `Workspace` neutro (individual/família/organização) | ACEITA (WP-101, 2026-09-12) |
| ADR-0004 | Servidor é a única autoridade temporal (trial/assinatura) | ACEITA |
| ADR-0005 | DeviceState derivado de timestamps, não armazenado como verdade | ACEITA |
| ADR-0006 | Heartbeat adiável (WorkManager) + FCM data; sem polling agressivo | ACEITA |
| ADR-0007 | FCM é sinal de disponibilidade, nunca credencial | ACEITA |
| ADR-0008 | Command catalog fechado; sem execução arbitrária | ACEITA |
| ADR-0009 | Greenfield: nenhum artefato de terceiros é reutilizado | ACEITA |
| ADR-0010 | Autenticação humana ≠ autenticação de agente | ACEITA |
| ADR-0011 | Trial/planos/limites como dado configurável, não hard-coded | ACEITA |
| ADR-0012 | Backend stack: NestJS/TypeScript, PostgreSQL/Prisma | ACEITA (WP-101, 2026-09-12) |
| ADR-0013 | Preservar a fundação Android atual | ACEITA |

---

## ADR-0001 — Marca NextGuardian vs. identificadores técnicos `nexguardian` · ACEITA (2026-09-12)

**Decisão do proprietário (opção A):**
- Marca comercial oficial = **`NextGuardian`** (UI, marketing, textos, domínios/URLs futuros).
- Identificadores técnicos existentes = **`nexguardian`** mantidos onde já existem (`com.nexguardian.agent`, `rootProject.name = "NexGuardianAgent"`, pastas, pacotes Kotlin). **Não** renomear código agora.
- A assimetria é intencional e aceita: `applicationId` permanece `com.nexguardian.agent` (é imutável após publicação no Play, então manter evita custo futuro). Firebase, banco, endpoints e domínios futuros usam a marca comercial no que é visível e `nexguardian` no que é identificador técnico interno, sem novo refactor.

**Contexto.** Coexistem três grafias: **NextGuardian** (nome comercial), `com.nexguardian.agent` (applicationId/namespace no código) e `NexGuardianAgent` (`rootProject.name`). A pasta do repositório é `nexguardian`.

**Impact assessment (custo de padronizar tudo em "NextGuardian" agora vs. depois):**

| Dimensão | Se manter `nexguardian` técnico | Se renomear para `nextguardian` |
| --- | --- | --- |
| Nome comercial / UI / marketing | livre (`NextGuardian`), independe do package | igual |
| `applicationId` | **imutável após publicação no Play** — mudar = novo app, perde instalações/reviews | só barato **antes** do 1º publish |
| namespace/pacotes Kotlin | refactor mecânico amplo | refactor mecânico amplo |
| diretórios | renomear pastas | renomear pastas |
| banco/endpoints/domínios/URLs | ainda não existem → custo ~zero se decidir já | idem |
| Firebase | projeto ainda não criado → definir nome no ato | idem |
| assinatura/Play Console | não iniciados | definir com o nome final |
| CI/CD | inexistente | criar já com o nome final |
| documentação | busca/substituição | busca/substituição |

**Opções.**
- **A — Marca comercial `NextGuardian`, identificadores técnicos `nexguardian` (com "x", sem "t") permanentes.** Custo zero, sem refactor. Divergência puramente cosmética; `applicationId` nunca muda depois do Play. Recomendada salvo objeção do proprietário.
- **B — Padronizar tudo em `nextguardian` agora.** Momento mais barato possível (nada publicado, sem backend). Custo: refactor mecânico único + alinhar `rootProject.name`. Elimina a divergência de vez.
- **C — Adiar.** Aumenta o risco de publicar com `applicationId` que não se pode mais mudar.

**Resolução:** escolhida a **opção A**. Consequência prática: nenhum refactor técnico; a divergência de grafia é cosmética e permanente. O único cuidado permanente é **não** deixar a marca comercial "NextGuardian" contaminar identificadores técnicos internos (que seguem `nexguardian`), nem o inverso em textos visíveis ao usuário.

---

## ADR-0002 — Core + perfis · ACEITA
Backend único (NextGuardian Core) com perfis Family/Responsible e Business/MDM via `Workspace.profile`/feature flags. Ver [doc 13](13-modelo-produto-core-perfis.md). Consequência: nenhuma capacidade de perfil vira requisito do Core; sem duplicação de backend.

## ADR-0003 — Tenancy neutra · ACEITA (2026-09-12)
Abstração `Workspace` representa conta individual, família e organização; RBAC varia por perfil, **isolamento não**. Ver [doc 21](21-dominio-erd-tenancy.md). Confirmada no kickoff do WP-101 sob autorização explícita do proprietário para adotar as opções do pacote e seus documentos autoritativos. `Workspace` é a terminologia interna adotada; `accountId` do contrato WP-001 e o Android permanecem intactos. Implementação e teste de isolamento pertencem ao WP-102; aceitar o ADR não equivale a implementá-los.

## ADR-0004 — Servidor autoridade temporal · ACEITA
Trial/assinatura decididos em UTC no servidor; relógio do device não concede direito. Já refletido no domínio (`Subscription`/`withServerState`).

## ADR-0005 — DeviceState derivado · ACEITA
Presença/frescor derivados de `lastSeen`/`lastHeartbeat`/`lastSuccessfulSync`; não armazenar "ONLINE" como verdade permanente. Ver [doc 12](12-devicestate-heartbeat.md).

## ADR-0006 — Heartbeat adiável · ACEITA
WorkManager periódico (≥15 min) + FCM data para latência; retry/backoff/jitter; sem FGS permanente só para heartbeat.

## ADR-0007 — FCM é sinal · ACEITA
Token FCM é endereço de entrega; toda operação reautentica na API. Ver [doc 26](26-fcm-arquitetura.md).

## ADR-0008 — Command catalog fechado · ACEITA
Catálogo enumerado, idempotência, ACK, expiração; nada de código arbitrário/captura. Ver [doc 15](15-motor-regras-comandos.md).

## ADR-0009 — Greenfield · ACEITA
Produto desenhado do zero; nenhum artefato de terceiros (código, recursos, IDs, certificados, endpoints, protocolos) é reutilizado. Nada de ocultação ou evasão.

## ADR-0010 — Auth humana ≠ agente · ACEITA
Sessão humana (login/refresh/2FA) e credencial de agente (enrollment/Keystore/rotação) são sistemas distintos. Ver [doc 22](22-autenticacao.md).

## ADR-0011 — Entitlements configuráveis · ACEITA
`Plan`/`Subscription`/`Entitlement` guardam limites/trial/flags como dado. `NEX-48H`/48h são demo. Ver [doc 23](23-trial-entitlements.md).

## ADR-0012 — Backend stack · ACEITA (2026-09-12)
Confirmada pela autorização do WP-101, que escolhe explicitamente NestJS e remete ao doc 24: Node.js LTS + TypeScript + NestJS (adaptador Express padrão) + PostgreSQL + Prisma + Zod + Docker, monólito modular. Logs pino; testes Jest + supertest. Bootstrap usa Node 24 e TypeScript 5.9 por compatibilidade com ts-jest (<7). PostgreSQL/Prisma aceitos como direção, mas banco, schema, migrations e isolamento implementado ficam exclusivamente no WP-102. Ver [doc 24](24-backend-stack.md). Não há microserviços.

## ADR-0013 — Preservar fundação Android · ACEITA
Kotlin/Compose, minSdk 26, fluxo e domínio atuais são preservados; novas trilhas estendem, não reescrevem.

## ADR-0014 — Perfil inicial do MVP = Family/Responsible · ACEITA (2026-09-12)
**Decisão do proprietário.** O MVP lança com o perfil **Family/Responsible**. **Business/MDM permanece como perfil posterior** sobre o **mesmo NextGuardian Core** — sem remover, sem duplicar backend (reforça ADR-0002).

Consequências:
- Fase 1A/1B e a integração Android priorizam o fluxo Family (consentimento transparente, localização/geofence consentidos, alertas seguros, `RING_DEVICE`/`SHOW_MESSAGE`); ver [doc 13](13-modelo-produto-core-perfis.md) §3 e trilha Family no [roadmap](implementation-roadmap.md).
- Capacidades exclusivas de Business (DO/PO, `LOCK_DEVICE`/`WIPE_CORPORATE_DATA`, enforcement de política) **não** entram no MVP e **não** viram requisito do Core.
- `Workspace.profile` já contempla `FAMILY`; nenhuma mudança de arquitetura, só de priorização.
- Resolve a pergunta 4b do [doc 19](19-decisoes-perguntas-nao-implementar.md).
