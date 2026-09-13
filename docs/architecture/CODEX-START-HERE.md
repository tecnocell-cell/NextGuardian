# CODEX — COMECE AQUI

Data: 2026-09-11. Primeiro arquivo que o Codex lê ao retomar o NextGuardian. Curto de propósito.

## 1. Onde o projeto está
Monorepo em `C:/Users/Root/Documents/nexguardian`. Existe uma **fundação Android compilável e testada** (`apps/android-agent`, `com.nexguardian.agent` 0.1.0-demo) e **contratos OpenAPI** (`packages/contracts`). Há backend WP-101/102 em `services/api`: `/health`, schema/migration PostgreSQL/Prisma e repositório Workspace/Membership testado. Sem banco permanente provisionado, endpoints de negócio ou painel.

## 2. O que já funciona (não refazer)
- **Backend `services/api` (real e testado):** os 10 endpoints do OpenAPI implementados (auth register/login, activation/validate, devices pair/confirm/refresh/heartbeat/revoke/me, subscription/me), sobre NestJS + Prisma + PostgreSQL. Senha e tokens só como hash; trial transacional uma vez por workspace; rotação de refresh com detecção de replay; isolamento por workspace. **19 testes unit + 22 de integração** (PostgreSQL real) verdes; build/lint OK.
- **Agente Android (demo):** fluxo Welcome→Activation→Pairing→Status→Settings; domínio limpo (`domain/Models.kt`); DataStore; adaptador Keystore (só verifica alias); 14 unit + 1 instrumentado. **Ainda consome mock, não a API real.**

## 3. O que é mock / falta (não descrever como pronto)
- **Agente Android** ainda usa `MockActivationRepository` (não fala com o backend); sem INTERNET/Retrofit/FCM; WorkManager desabilitado.
- **Falta:** integração do agente com a API real (WP-301), console operacional web (WP-201), e as fases posteriores (eventos, comandos/FCM, localização, políticas). Pagamento e verificação de e-mail continuam fora do MVP.

## 4. Documentos autoritativos
- Índice: [10-consolidacao-indice.md](10-consolidacao-indice.md)
- Estado real: [11-inventario-estado-real.md](11-inventario-estado-real.md) (§8 divergências doc×código)
- Decisões: [20-adr-registry.md](20-adr-registry.md)
- Domínio/ERD: [21-dominio-erd-tenancy.md](21-dominio-erd-tenancy.md)
- Contrato: `packages/contracts/openapi.json` + [25-openapi-audit.md](25-openapi-audit.md)
- **Pacotes de trabalho:** [codex-work-packages.md](codex-work-packages.md)
- Roadmap: [implementation-roadmap.md](implementation-roadmap.md)
- Regra: **código é evidência; doc é intenção.** Ao divergir, confie no código e registre no [changelog](architecture-changelog.md).

## 5. Últimas decisões arquiteturais (2026-09-12)
- Produto = **Core + perfis** Family/Business, backend único (ADR-0002).
- **Marca** (ADR-0001 ACEITA): comercial = `NextGuardian`; identificadores técnicos = `nexguardian` mantidos (`com.nexguardian.agent`, `NexGuardianAgent`). **Não renomear código.**
- **Perfil do MVP** (ADR-0014 ACEITA): **Family/Responsible**; Business/MDM é posterior sobre o mesmo Core.
- Tenancy neutra `Workspace` (ADR-0003 ACEITA); trial/limites **configuráveis** (ADR-0011); stack NestJS/TypeScript/PostgreSQL/Prisma (ADR-0012 ACEITA). Persistência base implementada/testada no WP-102; autenticação não implementada.

## 6. Estado dos pacotes
WP-001, WP-101, WP-102 concluídos (ver [relatório WP-102](wp-102-persistence-report.md)). **WP-103/104/105 concluídos** — os 10 endpoints do OpenAPI implementados e testados. **WP-301 concluído** — o agente Android tem cliente HTTP real (`core/network` + `data/RemoteActivationRepository`) atrás da flag `USE_REAL_API` (default mock); 26 testes unit JVM + APK + lint verdes. Próximo: **WP-201** (console operacional web). Não encadear execução sem autorização.

## 7. O que NÃO refazer / NÃO fazer
Não reescrever a fundação Android; **não renomear** applicationId/namespace/rootProject (seguem `nexguardian`); não implementar todas as fases; não conectar produção; não substituir mocks em massa; **não** implementar capacidades exclusivas de Business (DO/PO, lock/wipe) no MVP; nada clandestino/root/evasão; não introduzir microserviços.

## 8. Como validar
Android: `cd apps/android-agent && ./gradlew build test lint` (JDK 17, build-tools 36). Contratos: `python packages/contracts/validate_contract.py`. Backend em `services/api`: `npm run typecheck`, `npm test` (unit), `npm run lint`, `npm run build`; integração real: `PG_BIN="/c/Program Files/PostgreSQL/17/bin" npm run test:integration` (sobe um PostgreSQL efêmero, aplica migrações e roda o fluxo completo). Cada WP traz seus testes e critérios de aceite.

## 9. Onde registrar o resultado
Atualize o documento indicado no WP, o [architecture-changelog.md](architecture-changelog.md) (o que fez, testes, decisões) e o estado em [11-inventario-estado-real.md](11-inventario-estado-real.md). PARE ao fim do WP; não encadeie o próximo sem autorização.
