# Arquitetura FCM — NextGuardian

Data: 2026-09-11. Documento de desenho (ADR-0007). **Token FCM nunca é credencial de autorização.**

## 1. Fluxo (sinal + fetch autenticado)

```
Backend grava Command (status=QUEUED)
      │
      ▼  sinaliza (data message, sem payload sensível)
     FCM
      │
      ▼
Android Agent recebe sinal
      │
      ▼  autentica na API (DeviceSession)
   GET /devices/commands  (fetch autenticado)
      │
      ▼  executa → ACK autenticado
```

O sinal FCM só diz "há algo para buscar". O conteúdo do comando vem por **fetch autenticado**, não pela mensagem. Se o push se perder, o próximo heartbeat também descobre pendências (`pendingCommandCount`). Design validado como adequado: entrega best-effort com fonte de verdade no backend.

## 2. Pontos a documentar/implementar (futuro)

| Aspecto | Decisão |
| --- | --- |
| Token registration | agente registra token via endpoint autenticado; token ligado à `Installation`, não à identidade |
| Token refresh | `onNewToken` atualiza no backend; token antigo descartado |
| Device offline | mensagem data pode ser adiada/descartada (Doze/cota); heartbeat cobre a lacuna |
| Mensagem perdida | idempotência por `commandId`; reconciliação por heartbeat |
| Dedupe | agente ignora sinal se já buscou/executou aquele `commandId` |
| Segurança | payload do push sem dados sensíveis; nada acionável só com o push |
| Retry | backend re-sinaliza com backoff enquanto `Command` não sai de QUEUED/SIGNALLED |
| Revogação | device revogado → fetch/ACK falham auth; backend expira comandos |

## 3. Requisitos de projeto Firebase
Projeto Firebase próprio, criado do zero (nome ligado ao ADR-0001 de marca). Rotação de token gerida.

## 4. Estado atual
`PLANEJADO`. Sem SDK FCM no agente, sem `google-services.json`. Entra na Fase 4 ([roadmap](implementation-roadmap.md)), depois de comandos existirem no backend.
