# Trial, Planos e Entitlements — NextGuardian

Data: 2026-09-11. Documento de desenho (ADR-0011). O servidor é a autoridade temporal (ADR-0004).

## 1. Princípio: configurável, não hard-coded

`NEX-48H` e as 48h fixas são **demonstração** (`DemoAuthority` em `MockActivationRepository`). Em produção, limites/trial/features são **dado** em `Plan`/`Subscription`/`Entitlement`, decididos por perfil/plano — o proprietário pode definir valores depois sem mudar a arquitetura.

## 2. Modelo

```
Plan {
  planId, profile(INDIVIDUAL|FAMILY|BUSINESS), name
  deviceLimit, trialDurationHours, gracePeriodHours
  features: { <flag>: bool }        // entitlements padrão do plano
  active
}
Subscription {
  subscriptionId, workspaceId, planId
  state: TRIAL|ACTIVE|EXPIRED|CANCELLED
  trialStartedAt, trialExpiresAt      // UTC servidor; gravados uma vez
  currentPeriodStart, currentPeriodEnd
  gracePeriodEnd, suspendedAt, cancelledAt
}
Entitlement {                          // derivado, consultável por UI/agente
  workspaceId, feature, enabled, source(plan|override), expiresAt?
}
```

## 3. Regras

- **Trial transacional:** na 1ª confirmação, gravar `trialStartedAt` só se ainda não existir; `trialExpiresAt = trialStartedAt + plan.trialDurationHours`. Pertence ao **workspace**. Reinstalar/novo `installationId`/novo código **não** reinicia (ADR-0004).
- **deviceLimit** por plano: vincular além do limite falha com erro de domínio explícito.
- **Estados e transições:** TRIAL → ACTIVE (pagamento) | EXPIRED (fim do trial sem pagamento). ACTIVE → EXPIRED (fim de período) → grace → SUSPENDED. Qualquer → CANCELLED. `EXPIRED`/`SUSPENDED` **não** alteram vínculo nem conectividade — só entitlements.
- **Entitlements** decidem o que a UI/agente liberam; separam "vinculado" de "com direito".

## 4. Pagamento
Arquitetura preparada (`Subscription` guarda estado; webhooks futuros idempotentes/autenticados). **Provedor não escolhido** — `DECISÃO DO PRODUTO PENDENTE`. Nada de dados de cartão no nosso banco.

## 5. Estado atual
`IMPLEMENTADO / MOCK` (fixtures 48h) + `CONTRATO` (`Subscription` no domínio/OpenAPI). `Plan`/`Entitlement` são `DOCUMENTADO`. Implementação na Fase 1A (mínimo: trial configurável + deviceLimit).
