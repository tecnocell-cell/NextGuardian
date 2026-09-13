# Inventário do estado real — NextGuardian (rodada de consolidação)

Data: 2026-09-11. Documento de análise. Não altera código nem sobrescreve relatórios anteriores.
Fonte: leitura direta do repositório em `C:/Users/Root/Documents/nexguardian`.

## Legenda de estados

- **IMPLEMENTADO E FUNCIONAL** — existe em código, compila e faz o que diz, sem simulação.
- **IMPLEMENTADO COM SIMULAÇÃO** — existe em código e funciona, mas com fixtures/mock; não fala com servidor real.
- **CONTRATO CRIADO** — schema/porta/interface definida, sem adaptador de produção.
- **SOMENTE DOCUMENTADO** — descrito em relatório/README, sem código.
- **PLANEJADO** — citado como intenção futura.
- **AUSENTE** — não existe em nenhuma forma.

Regra: uma classe/pasta reservada **não** conta como implementação. Ativação, assinatura, backend, autenticação e heartbeat estão **simulados** e são tratados como tal.

## 1. Aplicativo Android (`apps/android-agent`, `com.nexguardian.agent` 0.1.0-demo)

| Item | Estado | Evidência |
| --- | --- | --- |
| Módulo Gradle único `:app` compilável | IMPLEMENTADO E FUNCIONAL | `android-foundation-build.md`; BUILD SUCCESSFUL 1m26s |
| Toolchain fixada (AGP 9.2.1, Gradle 9.4.1, Kotlin 2.3.10, Compose BOM 2026.08.00) | IMPLEMENTADO E FUNCIONAL | `app/build.gradle.kts`, README |
| minSdk 26 / compileSdk 37 / targetSdk 37 | IMPLEMENTADO E FUNCIONAL | README (Android 8 físico ainda não testado) |
| Fluxo Welcome → Activation → Pairing → Status → Settings | IMPLEMENTADO COM SIMULAÇÃO | `feature/*`, `NexGuardianApp.kt` |
| Máquina de estados de vínculo (`PairingTransitions`) | IMPLEMENTADO E FUNCIONAL | `domain/Models.kt`; puro, testado |
| Validação de ativação (`ActivationValidator`) | IMPLEMENTADO E FUNCIONAL (lógica) | `domain/Models.kt`; usa `serverNow` injetado |
| Estados independentes: vínculo / assinatura / conexão | IMPLEMENTADO E FUNCIONAL | 4 enums separados em `Models.kt` |
| UUID de instalação persistente | IMPLEMENTADO COM SIMULAÇÃO | criado após 1ª validação; reinstalar gera outro |
| Persistência local (DataStore) | IMPLEMENTADO E FUNCIONAL | `PreferencesSessionStore.kt`; sobrevive a force-stop |
| `DeviceCredentialStore` + adaptador Keystore | CONTRATO CRIADO | `core/security`; não emite chave/credencial |
| Trial 48h | IMPLEMENTADO COM SIMULAÇÃO | fixtures fixas 11→13/09/2026 UTC; relógio local não concede |
| Heartbeat | IMPLEMENTADO COM SIMULAÇÃO | `service/heartbeat/Heartbeat.kt`; sem rede, sem agendamento |
| WorkManager | CONTRATO CRIADO (dep. preparada) | inicialização automática removida no manifesto; nenhum Worker agendado |
| Testes de domínio (14) + navegação instrumentada (1) | IMPLEMENTADO E FUNCIONAL | XML de resultados no build |
| Cliente HTTP / Retrofit | AUSENTE | sem permissão INTERNET no manifesto do app |
| Firebase / FCM real | AUSENTE | nenhum SDK, nenhum `google-services.json` |
| Permissões sensíveis (localização, câmera, mic, SMS, accessibility, device admin) | AUSENTE (por decisão) | manifesto declara apenas o mínimo |

### Grupos arquiteturais reservados mas vazios de lógica de produção
`core/network`, `core/realtime`, `feature/permissions`, `service/messaging` — **PLANEJADO** (pasta/README, sem Kotlin de produção).

## 2. Contratos (`packages/contracts`)

| Item | Estado | Observação |
| --- | --- | --- |
| OpenAPI 3.1 com 10 endpoints | CONTRATO CRIADO | `openapi.json`; validado por `validate_contract.py` |
| Schemas de sessão (conta/dispositivo) separados | CONTRATO CRIADO | `AccountSession`, `DeviceSession` |
| Tickets de ativação/pareamento | CONTRATO CRIADO | `IssuedActivationCode`, `ValidateActivationResponse` |
| `HeartbeatRequest` telemetria mínima | CONTRATO CRIADO | `additionalProperties:false`; sem localização/mídia |
| Regras de idempotência, rotação de refresh, no-store | SOMENTE DOCUMENTADO | `contracts/README.md` (texto normativo, sem servidor) |
| Backend que implemente qualquer endpoint | AUSENTE | nenhum serviço em `services/` |

Endpoints contratados: `POST /auth/register`, `/auth/login`, `/activation/validate`, `/devices/pair`, `/devices/pair/confirm`, `/devices/session/refresh`, `/devices/heartbeat`, `/devices/revoke`; `GET /devices/me`, `/subscription/me`.

## 3. Domínio já modelado em código (fonte de verdade a preservar)

De `domain/Models.kt` — **não recriar sem razão técnica documentada**:

- Enums: `DevicePairingState {UNPAIRED, PAIRING_PENDING, PAIRED, REVOKED}`, `SubscriptionState {TRIAL, ACTIVE, EXPIRED, CANCELLED}`, `ConnectionState {ONLINE, OFFLINE, UNKNOWN}`, `ActivationState {NOT_STARTED, VALIDATED, CONFIRMED, REVOKED}`.
- Entidades: `Account`, `User`, `Device`, `ActivationCode`, `Subscription` (com invariante `trialExpiresAt > trialStartedAt` e `withServerState`), `DeviceInfo`, `LocalSession`, `AgentSnapshot`.
- Portas: `SessionStore`, `ActivationRepository`.

Estas são a base sobre a qual o `DeviceState` ampliado (doc 12) deve **estender**, não substituir.

## 4. Backend, painel web, pagamento, multitenancy real

| Item | Estado |
| --- | --- |
| API/backend (qualquer runtime) | AUSENTE |
| Painel web (admin/client) | AUSENTE (apenas citado como Next.js futuro em relatório) |
| Banco de dados | AUSENTE |
| Autenticação real / emissão de tokens | AUSENTE (só contrato) |
| Multitenancy (Tenant como entidade) | SOMENTE DOCUMENTADO (`Account` proposto como limite de tenant) |
| RBAC | AUSENTE |
| AuditLog | SOMENTE DOCUMENTADO (entidade proposta) |
| Pagamento / provedor | AUSENTE |
| Event platform / timeline | AUSENTE |
| Command center / fila FCM | AUSENTE |
| Location / geofence | AUSENTE |
| Rules engine / alertas | AUSENTE |
| Device risk score | AUSENTE |

## 6. Síntese

O que existe de fato: **um agente Android de demonstração, honesto e testado, com contratos e um domínio limpo**. Tudo que é "servidor" (ativação, trial, heartbeat, autenticação, assinatura) é **simulado**. Backend, painel, eventos, comandos, localização, políticas e risco são **ausentes** — território de desenho desta rodada, não de refação.

---

## 7. Auditoria técnica profunda (rodada gigante, 2026-09-11)

Inspeção direta de `settings.gradle.kts`, `app/build.gradle.kts`, `build.gradle.kts`, `gradle.properties`, código de infra e recursos.

| Aspecto | Valor real no repositório |
| --- | --- |
| Módulos Gradle | **Um só**: `:app`. `rootProject.name = "NexGuardianAgent"` |
| "Módulos" arquiteturais | Pastas de fontes adicionadas via `sourceSets.main.kotlin.directories` (14 diretórios); **não** são módulos Gradle |
| AGP / Kotlin | `com.android.application` 9.2.1; Kotlin **embutido no AGP 9** (não há plugin `kotlin.android` explícito); só `org.jetbrains.kotlin.plugin.compose` 2.3.10 |
| SDK | `minSdk=26`, `compileSdk=37`, `targetSdk=37`, `versionCode=1`, `versionName=0.1.0-demo` |
| applicationId / namespace | `com.nexguardian.agent` |
| buildFeatures | `compose=true`, `buildConfig=true` |
| Java/JVM | 17 |
| Deps de produção | compose-bom 2026.08.00, activity-compose 1.13.0, material3, lifecycle 2.11.0 (runtime/vm-compose), navigation-compose 2.10.1, coroutines-android 1.10.2, datastore-preferences 1.2.1, work-runtime-ktx 2.11.2 |
| Deps de teste | junit 4.13.2, coroutines-test 1.10.2, test-ext-junit 1.3.0, test-runner 1.7.0, espresso-core 3.7.0, ui-test-junit4, ui-test-manifest |
| **Ausentes** | Retrofit/OkHttp, Firebase/FCM, DI (Hilt/Koin), Room; permissão INTERNET; `network_security_config` |
| DataStore | `PreferencesSessionStore` real, persiste deviceId/pairing/activation/lastSync/demoSubscription |
| Keystore | `AndroidKeystoreCredentialStore` só verifica/deleta alias `nexguardian.device.identity.v1`; **não gera chave** |
| WorkManager | dep presente; `WorkManagerInitializer` removido no manifesto; `BackgroundScheduler` é interface vazia |
| Heartbeat | `MockHeartbeatGateway` devolve `serverTime`; `mockHeartbeat` envia `batteryLevel=null`, `networkType=UNKNOWN` |
| Rede | `usesCleartextTraffic="false"`; sem app INTERNET; sem cliente HTTP |
| Backup/privacidade | `backup_rules.xml` e `data_extraction_rules.xml` **excluem tudo** (root/file/database/sharedpref/external e device_*); `allowBackup="false"` |
| Testes | `ActivationDomainTest.kt` (111 linhas), `ActivationNavigationTest.kt` (53 linhas); build report cita 14 unit + 1 instrumentado |
| CI/CD | **Ausente** (`.github/` não existe) |
| `.tools/` | AVD isolado + validador de contratos Python; ignorado pelo Git |
| Git | repositório sem commits |

## 8. Documentação afirma X / repositório realmente contém Y

Regra: **o código é a evidência do que está implementado**; a documentação registra intenção/arquitetura. Divergências ficam registradas, não apagadas.

| # | Documentação afirma (X) | Repositório contém (Y) | Ação |
| --- | --- | --- | --- |
| D1 | "módulos `core/*`, `feature/*`, `service/*`" | um módulo `:app` com pastas de fonte | registrar; modularização Gradle é decisão futura |
| D2 | marca "NexGuardian" / usuário diz "NextGuardian" | código `com.nexguardian.agent`; root `NexGuardianAgent` | **ADR de marca** ([doc 20](20-adr-registry.md)) |
| D3 | "Heartbeat" como componente | mock sem rede, sem bateria/rede reais, sem agendamento | manter estado `IMPLEMENTADO / MOCK` |
| D4 | `HeartbeatRequest` exige `batteryLevel`/`networkType` não-nulos no schema | mock envia `null`/`UNKNOWN` | contrato e mock divergem; reconciliar na Fase 2 |
| D5 | `ActivationValidator.validate` compara `input.trim() != known.value` (case-sensitive) | `MockActivationRepository` faz `uppercase()` antes | comportamento real depende do caller; documentar |
| D6 | contratos falam em rotação/idempotência/refresh | nenhum servidor implementa | estado `CONTRATO`/`DOCUMENTADO` |
| D7 | relatórios citam Retrofit/FCM como stack | nenhuma dep presente | são **PLANEJADO**, não presentes |
| D8 | ~~mojibake no `openapi.json`~~ | **FALSO POSITIVO** — arquivo está em UTF-8 correto (verificado no WP-001: 0 bytes `C3 83`). O "mojibake" da rodada 3 foi artefato de leitura sem `encoding="utf-8"` (cp1252 no Windows). | resolvida; nenhum byte alterado por encoding ([doc 25](25-openapi-audit.md)) |
| D9 | `ConnectionState` como estado de 1ª classe | existe no domínio e no mock (`connection.value=ONLINE`) | alinhar com presença **derivada** ([doc 12](12-devicestate-heartbeat.md)) |

Nenhuma dessas divergências foi corrigida em código nesta rodada (só documentadas).

## 9. Legenda de classificação de evidências (uso consistente no projeto)

`IMPLEMENTADO` · `IMPLEMENTADO / MOCK` · `CONTRATO` · `DOCUMENTADO` · `PLANEJADO` · `COMPROVADO NO APK` · `REFERENCIADO NO APK / NÃO COMPROVADO` · `INFERIDO` · `ALEGADO POR PRODUTO EXTERNO / NÃO VALIDADO` · `VALIDADO POR DOCUMENTAÇÃO OFICIAL` · `DESCONHECIDO` · `DECISÃO DO PRODUTO PENDENTE` · `CONDICIONAL` · `NÃO RECOMENDADO` · `FORA DE ESCOPO`.

Regra permanente: **não converter inferência em fato.**


## 10. Atualização WP-101 — 2026-09-12

Esta seção atualiza o inventário; as seções anteriores preservam o retrato de consolidação. Backend bootstrap em `services/api`: IMPLEMENTADO E FUNCIONAL (`/health`, env Zod, logs, testes). Banco, autenticação, tenancy executável e os dez endpoints contratados permanecem AUSENTES. Nenhuma simulação Android foi substituída. PostgreSQL/Prisma: SOMENTE DOCUMENTADO/ACEITO para WP-102. Dockerfile criado; daemon indisponível nesta validação. [Relatório e critérios](wp-101-bootstrap-report.md).

Divergências de kickoff: doc 24/28 chamavam bootstrap de WP-001 e entrada ainda indicava WP-001 pendente; corrigidos para WP-101. ADR-0003/0012 constavam PROPOSTA; confirmados pela autorização expressa deste pacote. Account/accountId existentes não foram renomeados para Workspace. Isolamento será comprovado no WP-102, não alegado pelo health check.


## 11. Atualização WP-102 — 2026-09-12

Persistência base IMPLEMENTADA E TESTADA: Prisma/PostgreSQL, Workspace(profile/status), User global, Membership composta com role/status, migration inicial e WorkspaceRepository escopado. Integração real: 12 testes em cluster PostgreSQL 17.10 efêmero; regressão/unit/HTTP: 14 testes. Autenticação, endpoints de negócio e demais modelos continuam AUSENTES. Sem banco permanente instalado/provisionado, sem RLS, sem isolamento HTTP alegado. Doc 21 é a origem dos modelos; User global é exceção explícita à simplificação “toda tabela tem workspaceId”. Android/OpenAPI preservados. [Relatório](wp-102-persistence-report.md).
