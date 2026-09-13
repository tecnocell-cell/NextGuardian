# Estratégia de testes — NextGuardian

Data: 2026-09-11. Documento de desenho. Cada WP entregue ao Codex chega **com testes esperados**. "Funciona" sem critério verificável não é aceito.

## 1. Categorias e onde vivem

| Categoria | Alvo | Ferramenta |
| --- | --- | --- |
| Unit (domínio) | regras puras (transições, validação, entitlements) | JUnit/Kotlin; Vitest/Jest (backend) |
| Integration | módulo backend + Postgres | supertest + Postgres de teste (docker) |
| API contract | request/response vs. `openapi.json` | validador (existente) + testes de schema |
| Android unit | ViewModel/repos/mappers | JUnit + coroutines-test (já existe base) |
| Instrumentation | telas/navegação | Espresso/Compose test (já existe 1) |
| Navigation | fluxo Welcome→Settings | instrumentado (já existe) |
| Tenant isolation | Workspace A ≠ B | integração backend (obrigatório) |
| Replay | refresh/heartbeat | integração |
| Idempotency | confirm/comandos | integração |
| Retry/backoff | heartbeat/comandos | unit + integração |
| Offline/reconnect | agente | unit (gateways) + instrumentado |
| Revocation | sessão/credencial | integração |
| Clock skew | trial/heartbeat | unit (servidor autoridade) |

## 2. Testes obrigatórios já mapeados (do domínio existente)
`ActivationDomainTest` (14 casos: inválido/expirado/válido, UUID, reativação, limite de expiração, heartbeat) e `ActivationNavigationTest` (fluxo, revogação) — **preservar e estender**, não recriar.

## 3. Regra por WP
Cada WP em [codex-work-packages](codex-work-packages.md) traz a seção **Testes** com casos concretos e o comando de verificação (ex.: `gradlew test`, `npm test`, `validate_contract.py`). Critério de aceite referencia esses testes.

## 4. Estado atual
Android: `IMPLEMENTADO` (15 testes). Backend: `AUSENTE` (nasce com testes desde o WP-001). Isolamento de tenant: teste **obrigatório** desde o primeiro WP que introduzir workspace.


## 5. Validação WP-102 (2026-09-12)

Backend já existe (WP-101); menção anterior “nasce no WP-001” é histórica/desatualizada. `npm test`: 14 unit/HTTP/config. `npm run test:integration`: 12 testes reais do módulo Nest/repositório contra PostgreSQL efêmero, com migration aplicada. Não foram criados controllers para satisfazer supertest: testes HTTP existentes preservados; isolamento é de persistência. Docker estava indisponível; usados binários locais PostgreSQL 17.10 em cluster separado, não mocks/SQLite/serviço existente. Ambos os comandos exigidos para aceite, sem skip silencioso. [Relatório](wp-102-persistence-report.md).
