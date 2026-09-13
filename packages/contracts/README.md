# Contratos iniciais NexGuardian

OpenAPI 3.1: [openapi.json](openapi.json). Não há backend implementado ou servidor conectado.

## Fluxo e autoridade

Cadastro → conta → código → validação → pedido de vínculo → confirmação no aparelho → servidor confirma → trial. O registro/login pode emitir código; emissão não inicia nem reinicia trial. A demonstração Android simula tudo com fixtures próprias.

A primeira confirmação é transacional: usar horário UTC do servidor, gravar trialStartedAt somente se ainda não existir e trialExpiresAt = trialStartedAt + 48 horas. Esses campos pertencem à conta. Nova instalação, UUID, código ou dispositivo não alteram datas já concedidas. Definir posteriormente elegibilidade e limite de dispositivos por plano.

UUID é gerado pela instalação e persistido. Reinstalação pode produzir outro UUID; ele não identifica hardware nem detecta reinstalação. A prevenção de novo trial depende da conta no backend. Nenhum IMEI/serial.

## Segurança e consistência

- UUID nunca autentica. Diferenciar token de conta, de dispositivo, activationTicket e pairingTicket por audiência/escopo.
- Código de ativação é uma autorização temporária emitida à conta autenticada. validate liga o ticket ao UUID; pair cria pendência; confirm consome a autorização com confirmação visível no aparelho.
- confirmedOnDevice é declaração de UI, não atestado criptográfico. Planejar chave Keystore e prova de posse antes da produção; nenhuma infraestrutura de certificados foi criada.
- Tokens de resposta são segredos, mesmo quando não marcados writeOnly (precisam ser retornados). HTTPS e Cache-Control: no-store; não registrar/capturar payloads sensíveis em logs.
- Limitar tentativas, expirar tickets e garantir consumo atômico. FCM, futuramente, não substitui autenticação.
- Idempotency-Key por principal/operação/corpo; mesma chave com corpo diferente retorna 409. Preservar resultado de confirmação por prazo limitado para retry sem conceder outra sessão/trial. O tratamento deve permitir retry autorizado da mesma transação já consumida.
- Refresh token rotacionado; replay invalida família. Persistência de credenciais no Android deve usar proteção baseada no Keystore e nunca texto puro.
- REVOKED bloqueia sessão; EXPIRED é estado de assinatura separado e não muda vínculo ou conectividade. Endpoints de status/revogação podem continuar disponíveis com sessão válida após expiração.
- DeviceEvent/AuditLog futuros contêm somente dados mínimos e nunca senha, token ou conteúdo privado.
- Heartbeat não contém localização, fotos, áudio ou conversas. timestamp do cliente é não confiável; serverReceivedAt determina última observação.
- Login/registro precisam de política final de verificação de e-mail/antifraude antes de produção. Não há endpoints de confirmação de e-mail nesta base.

## Endpoints

POST /auth/register; POST /auth/login; POST /activation/validate; POST /devices/pair;
POST /devices/pair/confirm; POST /devices/session/refresh; POST /devices/heartbeat;
POST /devices/revoke; GET /devices/me; GET /subscription/me.

Schemas têm additionalProperties=false para evitar coleta acidental. Enums de vínculo, assinatura e conexão são independentes. Preços, pagamentos, painel e recursos de monitoramento estão fora desta implementação.

## Exemplos seguros

O mock Android aceita NEX-48H e EXPIRADO; são fixtures públicas, não credenciais de ambiente.
API real exigirá códigos próprios com entropia adequada. O host .invalid não opera.

## Validação

Instale requirements-validation.txt em ambiente Python isolado e execute python validate_contract.py. O teste valida OpenAPI e rejeita campo privado extra, bateria fora da faixa e identificador não UUID no heartbeat.
