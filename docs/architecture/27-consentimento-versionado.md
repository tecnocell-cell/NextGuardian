# Consentimento versionado — NextGuardian

Data: 2026-09-11. Documento de desenho. Não faz afirmações jurídicas definitivas; base para decisão com apoio legal.

## 1. Quatro conceitos distintos (não confundir)

| Conceito | O que é | Onde vive |
| --- | --- | --- |
| **Consentimento** | ato informado e versionado de autorizar um propósito | entidade `Consent` (nosso) |
| **Permissão Android** | grant técnico do SO (runtime/special access) | estado no device/heartbeat |
| **Base legal** | fundamento (LGPD) para tratar dado | política/legal |
| **Autorização administrativa** | poder do papel (RBAC) de acionar algo | `Membership`/RBAC |

Ter permissão Android **não** substitui consentimento; ter papel admin **não** substitui base legal.

## 2. Entidade `Consent`

```
Consent {
  consentId, workspaceId, deviceId?
  subject            // quem consente (responsável, usuário, org)
  version            // versão do texto/política
  purposes[]         // ex.: LOCATION, DEVICE_STATE, ALERTS
  context            // FAMILY | BUSINESS | INDIVIDUAL
  grantedAt, revokedAt
  evidence           // referência a texto/aceite (não conteúdo sensível)
  locale
  policyVersion
}
```

## 3. Regras

- Cada propósito sensível (localização, inventário estendido) exige consentimento **vigente**; sem ele, o dado não é coletado nem exibido.
- Revogar consentimento dispara política de exclusão/parada de coleta (retenção, doc 14/16).
- No perfil **Family**, consentimento é do responsável **com transparência** para quem usa o aparelho — nada oculto.
- No perfil **Business**, base é organizacional (aparelho corporativo/work profile) — ainda documentada e auditável.
- Toda mudança de consentimento → `AuditLog` (doc 18), sem registrar conteúdo sensível.

## 4. Estado atual
`DOCUMENTADO`. Validação legal (LGPD) é `DECISÃO DO PRODUTO PENDENTE` (com apoio jurídico). Entra antes de localização (Fase 5).
