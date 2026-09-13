# Fundação Android compilável — entrega

Data: 11/09/2026. Projeto: `C:/Users/Root/Documents/nexguardian`.

## Resultado

Aplicativo independente `com.nexguardian.agent`, versão `0.1.0-demo`, compilado e executado exclusivamente em emulador isolado. Fluxo Welcome → Activation → Pairing → Status → Settings funcional com dados simulados. Código de demonstração: `NEX-48H`; código vencido: `EXPIRADO`.

Não foram implementados backend, painel web, pagamento ou monitoramento nesta fundação.

## Estrutura e arquivos principais

Um único módulo Gradle `:app` em `apps/android-agent`, com fontes Kotlin organizadas em `app`, `domain`, `data`, `core/storage`, `core/security`, `feature/activation`, `feature/pairing`, `feature/status`, `feature/settings`, `service/heartbeat` e `service/background`. Os agrupamentos `core/network`, `core/realtime`, `feature/permissions` e `service/messaging` continuam reservados.

- [Instruções Android](../../apps/android-agent/README.md)
- [Configuração do módulo](../../apps/android-agent/app/build.gradle.kts)
- [Manifest](../../apps/android-agent/app/src/main/AndroidManifest.xml)
- [Contratos e regras comerciais](../../packages/contracts/README.md)
- [OpenAPI 3.1](../../packages/contracts/openapi.json)
- [Validador de contratos](../../packages/contracts/validate_contract.py)
- [Testes de domínio](../../apps/android-agent/app/src/test/kotlin/com/nexguardian/agent/ActivationDomainTest.kt)
- [Teste de navegação](../../apps/android-agent/app/src/androidTest/kotlin/com/nexguardian/agent/ActivationNavigationTest.kt)

Modelos Account, User, Device, ActivationCode e Subscription; estados de vínculo, assinatura e conexão independentes. UUID criado após primeira validação bem-sucedida. DataStore persiste UUID, vínculo, ativação, última sincronização e estado demonstrativo da assinatura. Abstração DeviceCredentialStore com adaptador Android Keystore preparada, sem emitir credenciais. WorkManager incluído sem inicialização automática nem tarefas agendadas.

Os dez endpoints solicitados estão especificados, sem implementação de servidor. Contratos distinguem sessão da conta, sessão do dispositivo e tickets temporários; preveem rotação/revogação e trial único por conta. Heartbeat contém somente dados técnicos mínimos. O mock usa datas fixas com intervalo de 48 horas; relógio local não concede trial. A garantia real contra reinício após reinstalação depende do backend futuro.

## Versões

| Item | Versão |
| --- | --- |
| Gradle Wrapper | 9.4.1, distribuição com checksum SHA-256 |
| Android Gradle Plugin | 9.2.1 |
| JDK / JVM target | 17 |
| Kotlin / Compose Compiler | 2.3.10 |
| Compose BOM / Material 3 | 2026.08.00 / gerenciado pelo BOM |
| Activity / Lifecycle / Navigation | 1.13.0 / 2.11.0 / 2.10.1 |
| Coroutines | 1.10.2 |
| DataStore / WorkManager | 1.2.1 / 2.11.2 |
| minSdk / compileSdk / targetSdk | 26 / 37 / 37 |
| Android Build Tools | 36.0.0 |
| JUnit / AndroidX runner / Espresso | 4.13.2 / 1.7.0 / 3.7.0 |
| Validador OpenAPI | openapi-spec-validator 0.9.0 |

## Validações executadas

Comando final: `gradlew.bat build test lint connectedDebugAndroidTest`.

| Verificação | Resultado e evidência |
| --- | --- |
| Build | BUILD SUCCESSFUL, 1m26s; [log final](../../apps/android-agent/build-verified.log) |
| Testes unitários | 14 testes, zero falhas/erros; [XML](../../apps/android-agent/app/build/test-results/testDebugUnitTest/TEST-com.nexguardian.agent.ActivationDomainTest.xml) |
| Navegação instrumentada | 1 teste aprovado no Android 17; [relatório](../../apps/android-agent/app/build/reports/androidTests/connected/debug/index.html) |
| Lint | Zero erros, três avisos de versões disponíveis; [relatório](../../apps/android-agent/app/build/reports/lint-results-debug.html) |
| Contratos | OpenAPI validado; quatro casos de heartbeat aprovados: válido, rejeição de localização, bateria fora da faixa e ID não UUID |
| Fluxo no app instalado | Cinco telas percorridas por automação de UI no emulador isolado |
| Persistência | Force-stop e reabertura preservaram vínculo, UUID e bytes do DataStore; [registro](manual-smoke.json) |

Os testes de domínio cobrem as oito situações solicitadas e casos adicionais de limite de expiração, UUID, reativação e heartbeat. O teste instrumentado cobre códigos inválido/expirado/válido, confirmação, expiração simulada e revogação.

Capturas: [Welcome](screenshots/welcome.png), [Activation](screenshots/activation.png), [Pairing](screenshots/pairing.png), [Status](screenshots/status.png), [Settings](screenshots/settings.png), [Status após reabertura](screenshots/status-restored.png). Status possui conteúdo rolável. Capturas de Status e Settings inspecionadas visualmente.

## Erros encontrados e corrigidos

1. AGP 9 com Kotlin integrado não incluiu fontes externas configuradas como Java. Correção: registro em `sourceSets.main.kotlin.directories`.
2. Erro de sintaxe temporário na alteração do Gradle corrigido antes da validação final.
3. Caminho SDK com escape incorreto em `local.properties`, sinalizado pelo lint, corrigido.
4. Espresso transitivo 3.5.0 falhou no Android 17 por referência a `InputManager.getInstance`. Dependência explícita 3.7.0 resolveu; teste instrumentado passou.
5. O teste de UI externo inicialmente encontrou o app desinstalado após tarefas instrumentadas. Reinstalação do APK debug permitiu completar navegação e persistência.

Logs das tentativas estão em `apps/android-agent/build-*.log`, ignorados pelo Git. Restam três avisos de atualização (Gradle 9.7.1 e Coroutines 1.11.0 nas dependências de aplicação/teste), e aviso de API de teste Compose depreciada. Não impedem compilação ou execução.

## Artefatos e limites

- [APK debug instalável](../../apps/android-agent/app/build/outputs/apk/debug/app-debug.apk)
- [APK release sem assinatura de distribuição](../../apps/android-agent/app/build/outputs/apk/release/app-release-unsigned.apk)

Validado em emulador Android 17 x86_64 isolado, com imagem já instalada no SDK. A matriz de aparelhos físicos e Android 8/API 26 ainda não foi executada. APK debug usa assinatura de desenvolvimento; distribuição comercial requer assinatura própria. Dados de ativação, trial e conexão são demonstrativos. Backend, autenticação real, armazenamento de credenciais, prevenção de abuso e pagamentos permanecem pendentes de outra rodada.

Git já existente preservado; arquivos permanecem sem commit. Nenhum conteúdo anterior foi apagado.

Trabalho encerrado nesta fundação compilável, conforme solicitado.
