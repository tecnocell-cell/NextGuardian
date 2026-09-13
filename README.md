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

- ✅ **Backend Core (MVP):** os 10 endpoints do OpenAPI implementados (auth, ativação, enrollment de dispositivo, heartbeat, assinatura/trial) com **isolamento por workspace**, senha/tokens só como hash, trial transacional único e rotação de refresh com detecção de replay. Testado contra PostgreSQL real (unit + integração).
- ✅ **Agente Android:** fundação demo compilável (fluxo de onboarding, ativação, vínculo, status).
- 🚧 **Em construção:** integração do agente à API, console web, eventos/comandos, localização/geofence, políticas e ponto eletrônico.

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
