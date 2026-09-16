# NextGuardian

**NextGuardian** é uma plataforma **SaaS multi-tenant** para **gestão e monitoramento consentido e transparente de dispositivos Android** — controle parental para famílias e **MDM (Mobile Device Management)** para empresas, sobre um mesmo núcleo (NextGuardian Core).

> Localização em tempo real (consentida), histórico de localização, geofence, alertas, gestão de dispositivos corporativos, ponto eletrônico e políticas de segurança — construído para ser **legítimo, transparente e em conformidade com a LGPD**, nunca vigilância clandestina.

<!-- SEO keywords -->
`gestão de dispositivos` · `MDM` · `controle parental` · `family safety` · `mobile device management` · `rastreamento de dispositivos consentido` · `geofence` · `ponto eletrônico` · `Android Enterprise` · `Device Owner` · `LGPD` · `SaaS multi-tenant`

---

## Perfis do produto

| Perfil | Para quem | Capacidades |
| --- | --- | --- |
| **Family / Responsible** (MVP) | Famílias e responsáveis | Localização consentida, geofence, alertas seguros, uso de apps/tempo de tela, transparência |
| **Business / MDM** | Empresas com frota de dispositivos | Políticas, controles de dispositivo (Device/Profile Owner), bloqueio de (des)instalação, ponto eletrônico |

Ambos compartilham o **NextGuardian Core** (contas, dispositivos, enrollment, assinatura, DeviceState, eventos, comandos, auditoria) — **sem duplicar backend**.

## Princípios

- **Consentimento e transparência** antes de qualquer coleta; app sempre visível.
- **Sem captura clandestina** (mensagens, mídia ou tela de terceiros), sem root, sem evasão.
- **Play-compatível** e **LGPD desde o desenho**.
- Servidor é a autoridade temporal; segredos e tokens nunca em texto puro.

## Arquitetura

```
apps/android-agent   Agente Android (Kotlin + Jetpack Compose)
services/api         Backend NestJS + TypeScript + Prisma + PostgreSQL
packages/contracts   Contrato OpenAPI 3.1
docs/architecture    Arquitetura viva (decisões, matrizes, roadmap, catálogo)
```

Comece por [`docs/architecture/10-consolidacao-indice.md`](docs/architecture/10-consolidacao-indice.md).

## Estado atual

- ✅ **Backend Core:** **25 paths** do OpenAPI implementados — auth, ativação, enrollment, heartbeat, assinatura/trial, eventos, comandos, políticas e risco explicável, RBAC por papel e localização/geofence. **Isolamento por workspace**, senha/tokens só como hash, trial transacional único e rotação de refresh com detecção de replay. Verificado contra PostgreSQL real: 36 testes unitários e 49 de integração.
- ✅ **Console web:** Next.js na porta 3001 — visão geral, dispositivos com detalhe (timeline, comandos, risco), vínculo, assinatura e configurações.
- ✅ **Agente Android:** onboarding, ativação e vínculo; integração com a API real, heartbeat que busca e confirma comandos, tokens cifrados no Keystore.
- 🚧 **Em construção:** coleta de localização no agente e mapa no console (Fase 5, servidor pronto); heartbeat automático em background; consentimento versionado; alertas.
- ⬜ **Não iniciado:** push/FCM, tempo de tela e limites (Family), MDM com Device Owner (Business), ponto eletrônico, console de super-admin e cobrança.

## Tecnologias

Kotlin · Jetpack Compose · Node.js · TypeScript · NestJS · Prisma · PostgreSQL · Zod · OpenAPI 3.1

## Desenvolvimento

```bash
# Backend
cd services/api
npm install
npm run typecheck && npm test && npm run lint && npm run build

# Contrato
python packages/contracts/validate_contract.py

# Agente Android
cd apps/android-agent
./gradlew build test lint
```

## Contato

**NextGuardian** — Criador: **Gianderson Fábio J.**
📧 giandersonfjs@gmail.com · 📞 +55 94 98140-6316

## Licença

© 2026 NextGuardian / Gianderson Fábio J. Todos os direitos reservados. Uso, cópia ou distribuição mediante autorização.
