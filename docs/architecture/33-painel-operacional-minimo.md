# Painel operacional mínimo (Fase 1B) — NextGuardian

Data: 2026-09-11. Documento de desenho. É o **console enxuto** para desenvolver/operar as fases iniciais — **não** o painel completo (esse é o [doc 17](17-painel-web.md), Fase 7). Objetivo: não desenvolver backend olhando só Swagger/log.

## 1. Escopo (após backend da Fase 1A)

| Módulo | Conteúdo mínimo |
| --- | --- |
| Login | autenticação humana (doc 22) |
| Workspace | seleção/contexto do workspace ativo |
| Devices | lista de dispositivos do workspace |
| Enrollment | ver estado de vínculo; acompanhar pair/confirm |
| Activation | emitir/ver códigos de ativação |
| Subscription/Trial | plano, estado, trial (configurável, doc 23) |
| Device detail (básico) | identidade, vínculo, assinatura |
| Status técnico | o que já existir no backend |

## 2. Crescimento incremental (acompanha as fases)
- Quando **heartbeat** existir (Fase 2): `lastSeen`, bateria, rede, frescor.
- Quando **eventos** existirem (Fase 3): timeline mínima.
- Quando **comandos** existirem (Fase 4): estado dos comandos.

## 3. Princípios
- Multi-tenant desde o login; tudo escopado por `workspaceId` (doc 21).
- **Honestidade**: não apresentar dado simulado como produto pronto; rotular claramente o que é mock.
- Reaproveitar a stack do painel completo (Next.js/React/TS) em versão mínima, ou até um app server-rendered simples — decisão de baixo custo, sem travar.

## 4. Estado atual
**IMPLEMENTADO** (rodada 11): `apps/web-admin` (Next.js + TypeScript + Tailwind), porta 3001, consumindo a API de conta (`account/me`, `GET /devices`, `subscription/me`, `activation/codes`, `devices/revoke`). Telas: login/registro, visão geral, dispositivos (lista + detalhe/revogação), vínculo (emitir código), assinatura, configurações. Backend e web em **duas portas** (3000 e 3001). `npm run build` verde. Próximo: prova e2e ao vivo e evolução para o painel completo ([doc 17](17-painel-web.md)).
