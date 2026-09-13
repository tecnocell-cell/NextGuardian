# CI/CD mínimo — NextGuardian

Data: 2026-09-11. Documento de desenho. **CI/CD é AUSENTE hoje** (`.github/` não existe). Documentar só o mínimo; não implementar infraestrutura excessiva nesta rodada.

## 1. Pipelines mínimos propostos

| Pipeline | Gatilho | Passos |
| --- | --- | --- |
| Android | PR/push tocando `apps/android-agent` | `gradlew build test lint` (build-tools 36, JDK 17) |
| Backend (quando existir) | PR/push tocando `services/api` | install, typecheck, `test`, lint, `prisma migrate` check |
| Contracts | PR tocando `packages/contracts` | `validate_contract.py` |
| Segurança | PR | dependency audit (`npm audit`/gradle), secret scanning |
| Migration check | PR backend | migrations aplicam em Postgres efêmero |
| Artifact | tag | APK debug/release, imagem backend |

## 2. Princípios
- Rápido e barato; sem deploy automático a produção nesta fase.
- Instrumentation Android (emulador) pode ficar em job separado/opcional (custo).
- Secrets fora do repo; scanning bloqueia vazamento.

## 3. Estado atual
`AUSENTE`. Introduzir o pipeline Android + Contracts primeiro (baratos, já há build/testes/validador). Backend/migration entram com a Fase 1A.
