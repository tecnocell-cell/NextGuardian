# Segurança, Privacidade e Threat Model — NextGuardian

Data: 2026-09-11. Documento de desenho. Consolida e estende as normas já escritas em `packages/contracts/README.md`.

## 1. Autenticação e credenciais

| Item | Decisão |
| --- | --- |
| Tokens | Audiências separadas: conta, dispositivo, `activationTicket`, `pairingTicket`, FCM. UUID/installationId **nunca** autentica. |
| Refresh | Rotacionado; replay invalida a família inteira. |
| Device credentials | Prova de posse por chave no Android Keystore; planejar antes da produção (`confirmedOnDevice` atual é só UI). |
| Rotação | Chaves/segredos rotacionáveis; revogação invalida sessões imediatamente. |
| Transporte | HTTPS obrigatório; `Cache-Control: no-store` em respostas com token. |
| Idempotência | `Idempotency-Key` por principal/operação/corpo; mesma chave + corpo diferente = 409; retry autorizado da mesma transação não concede nova sessão/trial. |
| Proteção de replay | Nonce/expiração em tickets; consumo atômico. |
| Rate limiting | Em login, ativação, pair — contra brute force/enumeração. |

## 2. Isolamento e dados

- **Segregação por tenant** em toda consulta; teste obrigatório de acesso cruzado (deve falhar).
- Classificação, retenção e exclusão definidas **por dado** (heartbeat, eventos, localização) — ver docs 14 e 16.
- Minimização: schemas com `additionalProperties:false` (já praticado no heartbeat) para evitar coleta acidental.
- **LGPD desde o desenho**: base legal e consentimento versionado para dado pessoal (localização em especial); direito de exclusão/portabilidade; DPO/registro de tratamento a definir no plano comercial.

## 3. AuditLog

Trilha resistente a alteração (append-only; considerar encadeamento/hash chain na fase de backend) para: login, vinculação, revogação, mudança de política, comando, alteração de usuário, mudança de assinatura, acesso a informação sensível.

Registra: quem (`userId`), o quê, quando, `deviceId`, `tenantId`, resultado, e IP/contexto quando apropriado. **Nunca** registra senha, token ou conteúdo privado em texto puro.

## 4. Threat Model inicial (STRIDE resumido)

| Ameaça | Vetor | Mitigação |
| --- | --- | --- |
| **Spoofing** | token FCM forjado aciona operação | FCM é só endereço; toda operação reautentica na API |
| | reuso de código de ativação | uso único, expiração, consumo atômico, rate limit |
| **Tampering** | heartbeat/timestamp adulterado para ganhar trial | `serverReceivedAt` é autoridade; trial no servidor |
| | evento/alerta forjado | ingestão autenticada por sessão de device; append-only |
| **Repudiation** | admin nega ação sensível | AuditLog resistente a alteração |
| **Information disclosure** | vazamento entre tenants | segregação por `tenantId` + testes |
| | log com segredo | política de logs sem tokens/conteúdo |
| **Denial of service** | flood de heartbeats/comandos | rate limit, dedup, backoff, cota FCM |
| **Elevation of privilege** | viewer executa comando | RBAC verificado por request + auditoria |
| | replay de refresh | rotação + invalidação de família |
| **Abuso de trial** | reinstalar para novo trial | trial por conta no servidor; UUID/reinstalação não reinicia |
| **Comprometimento do device** | root/emulador | Play Integrity (futuro) → `integrity=SUSPECT` alimenta risk score |

## 4b. Threat model detalhado (ativo · ator · pré-condição · impacto · mitigação · detecção · teste)

| Ameaça | Ativo | Ator | Pré-condição | Impacto | Mitigação | Detecção | Teste futuro |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Account takeover | conta humana | externo | senha fraca/vazada | acesso ao workspace | hash forte, rate limit, 2FA futura | logins anômalos no AuditLog | brute force bloqueado |
| Access token theft | sessão humana | externo | token vazado | ações limitadas | token curto, escopo mínimo | uso fora de padrão | expiração curta |
| Refresh token theft | sessão | externo | refresh vazado | sessão prolongada | rotação + família | replay detectado | replay invalida família |
| Device credential theft | credencial device | externo | extração de token | agir como device | chave Keystore não exportável | duas installations | re-enrollment revoga |
| Installation cloning | `installationId` | externo | clone do id | ambiguidade | id não autentica sozinho | detecção de duplicidade | clone falha sem chave |
| Replay | requests | externo | captura de request | efeito repetido | nonce/Idempotency-Key/serverReceivedAt | duplicatas | dedupe |
| Forged heartbeat | telemetria | externo | forjar payload | estado falso/trial | auth device + serverReceivedAt | inconsistência | trial no servidor |
| IDOR / tenant breakout | dados de outro workspace | interno/externo | escopo mal aplicado | vazamento entre tenants | escopo por workspaceId | acesso cruzado logado | **isolamento (obrigatório)** |
| Command replay/injection | comandos | externo | reenvio/forja | ação indevida | idempotência, catálogo fechado, auth | AuditLog de comando | replay sem efeito |
| FCM token leak | token FCM | externo | vazamento | nada acionável só com push | token ≠ auth; fetch autenticado | — | push sozinho é inócuo |
| Logs com segredo | logs | interno | log indevido | vazamento | política sem tokens/conteúdo | secret scanning | teste de log |
| APK adulterado | integridade | externo | repackage | comportamento alterado | Play Integrity (futuro), assinatura própria | integrity=SUSPECT | gate de integridade |
| Backend compromise | tudo | externo | falha de infra | severo | segregação, secrets fora do repo, least privilege | alertas de infra | pentest futuro |
| Trial abuse | direito | usuário | reinstalar/recriar | trial repetido | trial por workspace no servidor | múltiplas tentativas | reinstalação não reinicia |
| Location exposure | localização | interno/externo | retenção/vazamento | privacidade | consentimento, retenção curta, cripto | acesso auditado | exclusão ao revogar |
| Backups | dados sensíveis | externo | backup do device | vazamento | backup exclui tudo (já configurado) | — | verificar exclusão |
| Retenção excessiva | qualquer dado | interno | reter demais | risco LGPD | retenção por classe (doc 14/16) | revisão | expurgo funciona |

## 5. Postura de privacidade do produto

O NextGuardian adota **consentimento explícito, estado visível, revogação/exclusão desde o desenho e telemetria mínima sem conteúdo privado**. Nada de captura clandestina. Ver a lista explícita do que **não** implementar em [doc 19](19-decisoes-perguntas-nao-implementar.md).

## 6. Estado atual

Normas **documentadas** e parcialmente refletidas nos contratos; **nenhuma** implementação de servidor. Segurança real é pré-requisito transversal das fases 1–4 do [roadmap](implementation-roadmap.md).
