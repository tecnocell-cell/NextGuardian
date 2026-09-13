# Observabilidade mínima — NextGuardian

Data: 2026-09-11. Documento de desenho. **Não** montar stack gigante agora; só o mínimo para operar e depurar as fases iniciais.

## 1. Logs estruturados
- Formato JSON (pino), com `requestId` por request e `correlationId` propagado (mesmo `correlationId` de eventos/comandos, doc 14).
- **Nunca** logar tokens, senhas, segredos ou conteúdo privado (regra do doc 18).
- Nível configurável; correlação humano↔device via `workspaceId`/`deviceId` (sem PII de conteúdo).

## 2. Métricas mínimas (quando houver backend)
| Métrica | Uso |
| --- | --- |
| API latency (p50/p95) | saúde de endpoints |
| API error rate (4xx/5xx) | regressões |
| heartbeat success/failure | saúde do fleet |
| FCM signalling enviado/falho | entrega de comandos |
| command delivery/ACK rate | eficácia do command center |
| queue depth (futuro) | backlog de comandos |

## 3. Distinção importante
Observabilidade (operação do sistema) ≠ `Event`/timeline (fatos do device) ≠ `AuditLog` (ações administrativas). Três destinos separados, doc 14/18.

## 4. Estado atual
WP-101 (2026-09-12): logs HTTP estruturados IMPLEMENTADOS em services/api, requestId próprio e correlationId UUID validado. Sem cabeçalhos/corpos/query nos logs. Métricas, integração device e audit log continuam PLANEJADOS. Bootstrap corresponde ao WP-101.
