# NexGuardian Android — demonstração 0.1.0

Projeto Android real com um único módulo Gradle (:app). As pastas arquiteturais externas são incluídas como fontes Kotlin desse módulo; não são módulos Gradle independentes.

## Executar

Pré-requisitos: JDK 17, Android SDK Platform 37.0 e Build Tools 36.0.0. Abra esta pasta no Android Studio ou configure sdk.dir em local.properties (arquivo local ignorado pelo Git).

No PowerShell, nesta pasta:

~~~powershell
.\gradlew.bat build test lint
.\gradlew.bat connectedDebugAndroidTest
~~~

O segundo comando precisa de um emulador/dispositivo de teste. Nesta rodada usamos apenas o emulador isolado NexGuardian_Test. APK debug: app/build/outputs/apk/debug/app-debug.apk. Release ainda não possui chave de distribuição.

## Fluxo disponível

Welcome → ActivationCode → PairingConfirmation → Status → Settings.

- NEX-48H: validação simulada bem-sucedida.
- EXPIRADO: código vencido.
- Qualquer outro valor: código inválido.
- Confirme o vínculo para visualizar o trial fictício.
- Configurações permite simular expiração e revogar o vínculo com confirmação.
- Status permite simular heartbeat, sem chamada de rede.
- Após encerrar/reabrir, o vínculo e UUID são recuperados do DataStore.

Datas da demonstração são fixtures: 11/09/2026 12:00 UTC até 13/09/2026 12:00 UTC. Não são calculadas pelo relógio local nem constituem concessão real de acesso. A tela converte apenas a apresentação para o fuso do aparelho.

## Arquitetura e dados

domain: modelos/estados/transições puros. data: autoridade/repositório mock. core/storage: DataStore com deviceId, pairingState, activationState, lastSync e estado de assinatura demonstrativo. core/security: DeviceCredentialStore e adaptador Keystore sem geração de chave ou token.

Um UUID é criado somente após validar a primeira ativação e persiste nesta instalação. Revogação/nova ativação preservam esse ID e as datas fictícias. Reinstalação pode gerar outro ID; no produto real a regra de trial pertence à conta no backend, nunca ao UUID.

WorkManager está como dependência preparada, com inicialização automática desabilitada e nenhum Worker agendado. Heartbeat é contrato + mock de status mínimo. Não há cliente HTTP, Firebase real ou permissão INTERNET declarada pelo app.

Os agrupamentos core/network, core/realtime, feature/permissions e service/messaging permanecem reservados. Sem acessibilidade, listener de notificações, device admin, câmera, microfone, localização, leitura de mídia/mensagens, root ou overlay.

## Versões

AGP 9.2.1; Gradle 9.4.1 (wrapper com SHA-256); Kotlin/Compose Compiler 2.3.10; Compose BOM 2026.08.00; Activity 1.13.0; Lifecycle 2.11.0; Navigation Compose 2.10.1; Coroutines 1.10.2; DataStore 1.2.1; WorkManager 2.11.2. minSdk 26; compileSdk/targetSdk 37; applicationId com.nexguardian.agent.

## Documentação

- [Contratos OpenAPI](../../packages/contracts/README.md)
- [Arquitetura aprovada](../../reverse-engineering/reports/nexguardian-android-architecture.md) — fotografia da rodada documental anterior.
- [Relatório de build](../../docs/reports/android-foundation-build.md)

Pendências de produção: backend, autenticação real, provas de posse e armazenamento de credenciais protegidas, emissão/consumo de códigos, autoridade temporal do servidor, provedor de pagamento e distribuição assinada. Nenhuma dessas integrações é simulada como se fosse real.
