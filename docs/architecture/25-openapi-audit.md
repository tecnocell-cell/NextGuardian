# Auditoria OpenAPI — NextGuardian

Data: 2026-09-11. Auditoria documental do `packages/contracts/openapi.json` (3.1.0, "NexGuardian Foundation API 0.1.0"). Validado por `validate_contract.py`. Nenhuma alteração no arquivo nesta rodada.

## 1. Encoding — resolvido (era falso positivo)

**Resultado da verificação no WP-001 (2026-09-12):** o `openapi.json` está em **UTF-8 correto**. Verificado por bytes (`count(b"\xc3\x83") == 0`) e por leitura com `encoding="utf-8"`: as descrições leem "Telemetria mínima… é não confiável…", "negócio", "própria" etc., todas com acentuação correta.

O "mojibake" relatado na rodada 3 (divergência D8) foi um **falso positivo do inspetor**: a leitura anterior abriu o arquivo sem `encoding="utf-8"` e, no Windows, o Python usou cp1252, exibindo bytes UTF-8 (`C3 A9` = "é") como "Ã©". **Nenhuma correção de encoding foi necessária**; nenhum byte foi alterado por esse motivo. D8 fica marcada como resolvida/inválida no [inventário](11-inventario-estado-real.md).

## 2. Auditoria por endpoint

Todos hoje respondem o conjunto `200/201,400,401,403,409,429,500`. `additionalProperties:false` em todos os schemas (anticoleta).

| Endpoint | opId | Ator | Auth | Escopo | Idempotência | Dados sensíveis | Nota |
| --- | --- | --- | --- | --- | --- | --- | --- |
| POST /auth/register | register | humano anônimo | nenhuma | cria workspace | e-mail (409 duplicado) | senha, e-mail | falta política antifraude/verificação e-mail |
| POST /auth/login | login | humano | credencial | — | — | senha, tokens | rate limit (429) já previsto |
| POST /activation/validate | validateActivation | humano autenticado | conta | workspace | Idempotency-Key | código | liga ticket ao installationId |
| POST /devices/pair | requestPairing | humano/agente | conta/ticket | workspace | Idempotency-Key | — | cria pendência |
| POST /devices/pair/confirm | confirmPairing | agente | ticket | device | **crítica** (retry não duplica device/trial) | confirmação | emitir DeviceSession + prova de posse (hoje UI) |
| POST /devices/session/refresh | refreshDeviceSession | agente | refresh device | device | rotação | tokens | replay invalida família |
| POST /devices/heartbeat | heartbeat | agente | DeviceSession | device | dedupe por device+intervalo | postura | `serverReceivedAt` autoridade |
| POST /devices/revoke | revokeDevice | humano/agente | conta/device | device | idempotente | — | invalida sessões |
| GET /devices/me | getDevice | agente | DeviceSession | device | — | postura | leitura do próprio device |
| GET /subscription/me | getSubscription | agente/humano | sessão | workspace | — | — | estado de assinatura |

## 3. Achados

- **Escopo de workspace — formalizado no WP-001 (descrições dos bearer):** `accountBearer`/`deviceBearer` agora declaram explicitamente que o isolamento (accountId, que mapeia o `Workspace` do domínio — ADR-0003) é carregado como **claim no token** e que **nenhum endpoint aceita identificador de conta/workspace por query ou path**. Não se renomeou `accountId` (ADR-0003 ainda PROPOSTA) nem se criou mecanismo paralelo de tenancy. Os endpoints `me` (`/devices/me`, `/subscription/me`) já derivam o escopo do token.
- **Idempotency-Key — já formalizada e agora completa:** presente como header `required` (uuid) em `/auth/register`, `/devices/pair`, `/devices/pair/confirm`, `/devices/heartbeat`, `/devices/revoke`, e **adicionada no WP-001 a `/activation/validate`** (único mutador que faltava). `/auth/login` e `/devices/session/refresh` seguem sem ela por decisão (login não é mutador idempotente; refresh usa rotação).
- **`HeartbeatRequest`** exige `batteryLevel`/`networkType`; o mock envia `null`/`UNKNOWN` — compatível (`batteryLevel` é `[integer,null]`, `UNKNOWN` está no enum); o validador cobre exatamente esse caso. Sem ação (divergência D4 é aparente, não real).
- **Prova de posse** ausente: `ConfirmPairResponse`/confirm dependem de `confirmedOnDevice` (UI). Planejar chave Keystore (doc 22) — fora do WP-001.
- **`/activation/validate` é anônimo** (`security: []`) enquanto o doc de auditoria descreve ator "conta autenticada". É uma divergência de **semântica de auth**, deixada para o WP-104 (não alterada no WP-001, que é só saneamento).

## 4. Mínimo adicional para a Fase 1A (não criar API enorme)

Suficiente para o agente parar de simular ativação/vínculo:
1. `register`, `login` (auth humana mínima).
2. `activateValidate`, `pair`, `pair/confirm` (enrollment real, com Idempotency-Key formalizada).
3. `subscription/me` + trial configurável (doc 23).
4. `devices/me` (leitura).

`heartbeat`, `session/refresh`, `revoke` podem entrar em 1A′/Fase 2 conforme WPs. **Não** adicionar endpoints de eventos/comandos/localização agora (fases posteriores).

## 5. Estado atual
`CONTRATO` (10 endpoints), `VALIDADO` pelo validador Python. Zero implementação de servidor.
