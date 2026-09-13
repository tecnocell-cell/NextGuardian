# Plataforma de eventos e Timeline — NextGuardian

Data: 2026-09-11. Documento de desenho. Nada implementado; definir esquema, retenção e volume antes de qualquer código.

## 1. Princípio

Toda observação relevante vira um **Event** imutável na timeline de um dispositivo. A timeline é única por device e é a fonte para dashboard, alertas e auditoria de comportamento. Eventos **não** carregam conteúdo privado (mensagens, mídia, áudio).

## 2. Envelope comum

```
Event {
  eventId            // ULID/UUID, único
  tenantId
  deviceId           // null para eventos de conta
  eventType          // taxonomia abaixo
  severity           // INFO | NOTICE | WARNING | CRITICAL
  timestamp          // servidor (serverReceivedAt); cliente informa observedAt separado
  source             // AGENT | SERVER | ADMIN | SYSTEM
  payload            // objeto tipado por eventType, sem PII de conteúdo
  correlationId      // liga eventos de um mesmo fluxo (ex.: comando)
  policyId           // se originado de avaliação de política
  acknowledgedAt
  acknowledgedBy     // userId
}
```

## 3. Taxonomia

| eventType | Origem típica | Exemplos de payload |
| --- | --- | --- |
| `DEVICE_EVENT` | agente | heartbeat recebido, bateria crítica, app atualizado |
| `LOCATION_EVENT` | agente (consentido) | posição consentida com precisão/origem; nunca contínuo garantido |
| `GEOFENCE_EVENT` | agente | ENTER/EXIT/DWELL + geofenceId |
| `APP_EVENT` | agente | agente iniciado/parado, permissão alterada |
| `NETWORK_EVENT` | agente | mudança de tipo de rede, conectividade |
| `SECURITY_EVENT` | agente/servidor | integridade suspeita, sessão revogada, replay detectado |
| `POLICY_EVENT` | servidor | policy aplicada/violada, versão propagada |
| `COMMAND_EVENT` | servidor/agente | comando criado/entregue/executado/expirado (ver [doc 15](15-motor-regras-comandos.md)) |
| `ENROLLMENT_EVENT` | servidor | pair/confirm/revoke |
| `ACCOUNT_EVENT` | servidor | login, mudança de plano, membro adicionado |

`severity` é atributo do evento; `Alert` é entidade derivada quando uma **regra** eleva um evento a acionável (ver doc 15).

## 4. Retenção e volume (a dimensionar antes de implementar)

| Classe | Retenção proposta (a validar) | Justificativa |
| --- | --- | --- |
| `SECURITY_EVENT`, `ENROLLMENT_EVENT`, `POLICY_EVENT` | longa (ex.: 1 ano) | auditoria/compliance |
| `COMMAND_EVENT`, `ACCOUNT_EVENT` | média (ex.: 180 dias) | rastreabilidade operacional |
| `DEVICE_EVENT` de heartbeat | curta/agregada (ex.: 30 dias detalhado + agregados) | volume alto |
| `LOCATION_EVENT`/`GEOFENCE_EVENT` | curta e configurável por tenant (LGPD) | dado sensível |

Estimativa de volume (hipótese: heartbeat a cada 30 min ⇒ ~48 `DEVICE_EVENT`/device/dia; ~10 eventos não-heartbeat/device/dia; total ~58/device/dia ≈ ~21 mil/device/ano):

| Devices | Eventos/dia | Eventos/ano (ordem) | Observação |
| --- | --- | --- | --- |
| 1 | ~58 | ~21 mil | trivial |
| 10 | ~580 | ~210 mil | trivial |
| 100 | ~5,8 mil | ~2,1 mi | Postgres simples aguenta |
| 1.000 | ~58 mil | ~21 mi | Postgres **particionado por tempo** + agregação de heartbeat |
| 10.000 | ~580 mil | ~210 mi | particionamento + retenção agressiva de heartbeat; avaliar store dedicado só aqui |

**Hipóteses declaradas**: intervalo de 30 min, 10 eventos factuais/dia — a validar com dados reais. Conclusão: **PostgreSQL particionado por (`workspaceId`/tempo) é suficiente** até a casa dos milhares de devices, desde que heartbeat cru seja **agregado** (não guardar todo heartbeat indefinidamente). Store especializado (append-only dedicado) só se o volume real exigir — **não adotar antecipadamente**.

## 5. Regras de projeto

- Append-only; correções via novo evento, nunca edição.
- Ingestão idempotente por `eventId` (retry de agente não duplica).
- Nada de conteúdo privado no `payload` — validado por schema com `additionalProperties:false`, como já se faz no heartbeat.
- Timeline sempre filtrada por `tenantId` do solicitante.
- `LOCATION_EVENT` só existe com consentimento vigente; ao revogar, aplicar política de exclusão.

## 6. Estado atual

**NÃO EXISTE** no repositório. Este documento é pré-requisito da fase 3 do [roadmap](implementation-roadmap.md). Não implementar sem esquema, retenção e volume aprovados.
