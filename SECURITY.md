# Política de Segurança — NextGuardian

A segurança e a privacidade são princípios centrais do NextGuardian. O produto é desenhado para monitoramento **consentido e transparente**, em conformidade com a LGPD, sem captura clandestina.

## Como relatar uma vulnerabilidade

Se você encontrar uma vulnerabilidade de segurança, **não abra uma issue pública**. Envie um relato privado para:

- **E-mail:** giandersonfjs@gmail.com

Inclua, se possível: descrição, passos para reproduzir, impacto e versão/commit afetado. Comprometemo-nos a responder o mais breve possível e a corrigir problemas confirmados.

## Escopo

- Backend (`services/api`), agente Android (`apps/android-agent`) e contratos (`packages/contracts`).

## Práticas adotadas

- Senhas e tokens armazenados apenas como hash (nunca em texto puro).
- Isolamento por workspace (multi-tenant); rotação de refresh com detecção de replay.
- Segredos fora do repositório; nenhum segredo em logs.
