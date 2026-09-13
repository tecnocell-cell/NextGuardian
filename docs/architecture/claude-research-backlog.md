# Backlog de pesquisa do Claude — NextGuardian

Data: 2026-09-11. Pesquisas que avançam **em paralelo** enquanto o Codex implementa. Classificação: **BLOQUEANTE · IMPORTANTE · MELHORIA · FUTURO**.

## Android
- [BLOQUEANTE] Confirmar comportamento real de WorkManager periódico + FCM data por versão (A8→A15) para o intervalo de heartbeat. (doc 12/android-matrix)
- [IMPORTANTE] Política do Play para background location e `QUERY_ALL_PACKAGES` — requisitos de justificativa atuais.
- [IMPORTANTE] Provisioning DO/PO (afw/QR/zero-touch): caminho mínimo para o perfil Business.
- [MELHORIA] MediaProjection A14+ (FGS type, reconsentimento) para suporte remoto consentido.
- [FUTURO] Play Integrity: veredictos e uso como fator de risco (não bloqueio).
- [IMPORTANTE] Teste real em Android 8 físico (só emulador 17 até agora).

## Backend
- [BLOQUEANTE] Confirmar stack (ADR-0012) e formalizar Idempotency-Key/escopo de workspace no contrato.
- [IMPORTANTE] Estratégia de particionamento de eventos no Postgres (doc 14) e políticas de retenção/expurgo.
- [MELHORIA] Padrão de erros de domínio compartilhado agente↔API.

## Segurança / LGPD
- [BLOQUEANTE] Prova de posse via Keystore (substituir `confirmedOnDevice`).
- [IMPORTANTE] Bases legais LGPD por tipo de dado; retenção de localização; fluxo de exclusão (com apoio jurídico).
- [IMPORTANTE] Rotação de credencial de device e detecção de clonagem de installation.

## Family
- [IMPORTANTE] Fluxo de consentimento familiar transparente (doc 27); referências (Family Link/Family Safety).
- [MELHORIA] UX de onboarding e educação de permissões.

## MDM / Business
- [IMPORTANTE] Conjunto mínimo de políticas via `DevicePolicyManager` para o MVP Business.
- [FUTURO] Managed configurations para inventário de apps.

## UX / Painel
- [MELHORIA] Padrões de dashboard/timeline/alertas de MDM/fleet (doc 32) aplicáveis ao painel completo.
- [MELHORIA] Estados honestos no agente (loading/erro/offline/retry).

## Dados / Performance
- [IMPORTANTE] Validar hipóteses de volume de eventos (doc 14) com números reais quando houver piloto.
- [FUTURO] Agregação de heartbeat (rollups) para reduzir custo de storage.

## Distribuição
- [IMPORTANTE] Requisitos de publicação no Play para app de gestão/parental; disclosures obrigatórias.
- [FUTURO] Assinatura de release própria e canais de distribuição.

## Concorrentes
- [MELHORIA] Continuar estudo público (doc 32), separando marketing de capacidade validada.

## Testes
- [IMPORTANTE] Kit de testes de isolamento de tenant, replay, idempotência, revogação, clock skew (doc 29) pronto para reuso por WP.
