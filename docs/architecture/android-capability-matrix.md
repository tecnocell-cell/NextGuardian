# Matriz de capacidades Android — NextGuardian

Data: 2026-09-11. Documento de análise técnica. Baseia-se na plataforma Android pública (API 26+ até versões atuais).
Não usa Accessibility, Device Owner ou VPN como atalho para contornar segurança do Android. Cada recurso é avaliado pelo caminho **oficial e distribuível**.

## Como ler

Para cada recurso, doze perguntas:

1. Android normal permite? · 2. Runtime permission? · 3. Foreground service (FGS)? · 4. Notificação persistente? · 5. Device Owner (DO)? · 6. Accessibility? · 7. VPN local? · 8. Funciona em Android 8 (API 26)? · 9. Funciona em versões atuais (14/15)? · 10. Restrições importantes de background? · 11. Distribuível normalmente (Play)? · 12. Limitações a mostrar ao usuário.

Estados: **SIM / NÃO / PARCIAL / CONDICIONAL / NÃO RECOMENDADO**.

FGS a partir do Android 14 exige `foregroundServiceType` declarado e uma razão elegível; a notificação não elimina limites de background (Doze, App Standby Buckets, limites de start em background). WorkManager periódico tem intervalo mínimo de 15 min e não é tempo real.

---

## A. Enrollment, telemetria e ciclo do agente

### A1. Heartbeat / check-in periódico (status técnico mínimo)
1 SIM · 2 NÃO (só INTERNET, permissão normal) · 3 NÃO (preferir WorkManager) · 4 NÃO · 5 NÃO · 6 NÃO · 7 NÃO · 8 SIM · 9 SIM · 10 SIM: periódico mínimo 15 min, sujeito a Doze/bucket; use FCM data para "acordar" quando precisar de baixa latência · 11 SIM · 12 "Não é tempo real; frequência depende do estado de energia do aparelho."
**Recomendação: EXISTE (contrato) → implementar com WorkManager + FCM data. Base do produto.**

### A2. Push do servidor → dispositivo (comando/sync)
1 SIM · 2 NÃO · 3 NÃO · 4 NÃO · 5 NÃO · 6 NÃO · 7 NÃO · 8 SIM · 9 SIM · 10 PARCIAL: mensagem *data-only* pode ser adiada em Doze; *high priority* acorda mas tem cota · 11 SIM (FCM) · 12 "Entrega best-effort; comandos precisam de ACK e expiração."
**Recomendação: PLANEJAR (FCM). Não usar como canal de autenticação.**

### A3. Inventário do dispositivo (fabricante, modelo, versão, patch, app version)
1 SIM · 2 NÃO (dados de `Build`) · 3 NÃO · 4 NÃO · 5 NÃO · 6 NÃO · 7 NÃO · 8 SIM · 9 SIM · 10 NÃO · 11 SIM · 12 "IMEI/serial não são acessíveis a apps normais desde Android 10 (`READ_PRIVILEGED_PHONE_STATE` é privilegiada)."
**Recomendação: PLANEJAR. Usar identificador de instalação próprio, nunca IMEI/serial.**

### A4. Bateria / carga / rede
1 SIM · 2 NÃO · 3 NÃO · 4 NÃO · 5 NÃO · 6 NÃO · 7 NÃO · 8 SIM · 9 SIM · 10 NÃO · 11 SIM · 12 "Tipo de rede detalhado teve restrições; nível de bateria e status de carga são estáveis."
**Recomendação: PLANEJAR (parte do heartbeat).**

### A5. Reagendamento após boot
1 SIM · 2 NÃO (`RECEIVE_BOOT_COMPLETED`, normal) · 3 NÃO · 4 NÃO · 5 NÃO · 6 NÃO · 7 NÃO · 8 SIM · 9 SIM · 10 SIM: apps não podem iniciar serviços em background livremente após boot; WorkManager já persiste jobs · 11 SIM · 12 —
**Recomendação: CONDICIONAL — preferir persistência de WorkManager a um receiver dedicado.**

---

## B. Localização

### B1. Localização atual (com consentimento em foreground)
1 SIM · 2 SIM (`ACCESS_FINE/COARSE_LOCATION`) · 3 CONDICIONAL (se contínua) · 4 CONDICIONAL · 5 NÃO · 6 NÃO · 7 NÃO · 8 SIM · 9 SIM · 10 — · 11 SIM · 12 "Usuário pode conceder só localização aproximada (A12+)."
**Recomendação: PLANEJAR com consentimento explícito.**

### B2. Localização em background / contínua
1 PARCIAL · 2 SIM (`ACCESS_BACKGROUND_LOCATION`, concessão separada A10+) · 3 SIM (`foregroundServiceType=location`) · 4 SIM · 5 NÃO · 6 NÃO · 7 NÃO · 8 SIM · 9 SIM · 10 SIM: forte; Play exige justificativa de política · 11 CONDICIONAL (revisão de política do Play para background location) · 12 "Android **não garante** rastreamento contínuo; SO pode suspender."
**Recomendação: CONDICIONAL. Só com finalidade legítima declarada e consentimento; nunca prometer rastreamento ininterrupto.**

### B3. Geofence (entrada/saída/permanência)
1 SIM · 2 SIM (fine + background para disparo em bg) · 3 CONDICIONAL · 4 CONDICIONAL · 5 NÃO · 6 NÃO · 7 NÃO · 8 SIM · 9 SIM · 10 SIM: disparos podem atrasar/agrupar em Doze · 11 CONDICIONAL · 12 "Latência de disparo é variável; não é imediato."
**Recomendação: PLANEJAR (fase 5) com Geofencing API.**

---

## C. Gestão de dispositivo (MDM / parental legítimo)

### C1. Lock remoto / reset de senha / policy
1 CONDICIONAL · 2 NÃO (é admin de política, não runtime) · 3 NÃO · 4 NÃO · 5 SIM (Device Owner ou Profile Owner via `DevicePolicyManager`) · 6 NÃO · 7 NÃO · 8 PARCIAL (várias APIs de DA depreciando) · 9 SIM (via DO/PO moderno) · 10 — · 11 CONDICIONAL (provisioning DO exige fábrica/QR/afw) · 12 "Requer enrollment como Device/Profile Owner; não é ativável por um app comum já instalado."
**Recomendação: CONDICIONAL / fase avançada. Legítimo apenas em cenário MDM real com provisioning.**

### C2. Wipe de dados corporativos
1 CONDICIONAL · 5 SIM (DO/PO, `wipeData`/perfil) · 8 PARCIAL · 9 SIM · 11 CONDICIONAL · 12 "Só em perfil gerenciado; wipe total exige DO."
**Recomendação: CONDICIONAL — somente MDM/DO. Nunca clandestino.**

### C3. RING_DEVICE / SHOW_MESSAGE / REQUEST_CHECKIN
1 SIM · 2 NÃO (som/notificação locais) · 3 NÃO · 8 SIM · 9 SIM · 11 SIM · 12 —
**Recomendação: PLANEJAR — comandos legítimos e baratos, ótimos para validar o command center.**

### C4. Detectar troca de SIM/eSIM
1 PARCIAL · 2 SIM (`READ_PHONE_STATE`) · 9 PARCIAL: identificadores de SIM restritos em versões recentes · 11 CONDICIONAL · 12 "Capacidade degrada nas versões novas; tratar como best-effort."
**Recomendação: DESCONHECIDO/PARCIAL — validar por versão antes de prometer.**

### C5. Lista de apps instalados
1 PARCIAL · 2 SIM (A11+: `QUERY_ALL_PACKAGES` é permissão sensível de política, ou `<queries>` específico) · 9 PARCIAL · 11 CONDICIONAL (Play restringe `QUERY_ALL_PACKAGES`) · 12 "Visibilidade de pacotes é restrita por padrão."
**Recomendação: CONDICIONAL — usar `<queries>` mínimo; evitar `QUERY_ALL_PACKAGES` salvo justificativa MDM.**

---

## D. Capacidades sensíveis excluídas (avaliação defensiva)

Avaliadas para **rejeição consciente**, não para adoção. Não entram no produto.

### D1. Accessibility Service para leitura de tela/automação
1 SIM (tecnicamente) · 6 SIM · 9 SIM · 11 **NÃO** para captura: Play proíbe uso de acessibilidade fora de finalidade de acessibilidade real · 12 —
**Recomendação: NÃO RECOMENDADO. Não usar Accessibility como atalho de vigilância.**

### D2. Notification Listener (ler notificações de terceiros)
1 SIM · 2 consentimento especial do usuário · 9 SIM · 11 NÃO RECOMENDADO (política + privacidade) · 12 —
**Recomendação: NÃO RECOMENDADO na base inicial.**

### D3. Leitura de SMS / call log / contatos / calendário
1 PARCIAL · 2 SIM (grupos restritos) · 11 **NÃO** em geral: `READ_SMS`/`READ_CALL_LOG` são *Restricted Permissions* do Play, liberadas só a apps com função central de SMS/telefonia · 12 —
**Recomendação: NÃO RECOMENDADO. Fora do escopo de gestão consentida.**

### D4. Câmera/microfone remotos, gravação ambiente, gravação de chamada
1 câmera/mic SIM com permissão; **gravação de chamada bloqueada** por API desde Android 10 (sem caminho oficial) · 6/root muitas vezes exigido em produtos clandestinos · 11 **NÃO** · 12 —
**Recomendação: NÃO RECOMENDADO / PROIBIDO. Captura clandestina não entra no produto.**

### D5. Root / superuser, `WRITE_SECURE_SETTINGS`, injeção dinâmica de código
1 NÃO em app normal · 11 **NÃO** · 12 —
**Recomendação: PROIBIDO. Não reutilizar nada de infraestrutura de injeção/ocultação do APK.**

### D6. `SYSTEM_ALERT_WINDOW` (overlay), `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`
1 SIM · 11 CONDICIONAL (Play restringe overlay e isenção de bateria a casos justificados) · 12 "Isenção de bateria melhora entrega mas é revisada pelo Play e incomoda o usuário."
**Recomendação: NÃO RECOMENDADO por padrão; avaliar isenção de bateria só com justificativa clara.**

---

## D7. Aprofundamento — 20 dimensões (capacidades estruturais)

Framework de 20 perguntas: 1 permite? · 2 API oficial · 3 runtime permission · 4 special access · 5 FGS · 6 notificação persistente · 7 WorkManager · 8 DO/PO · 9 VPN · 10 Accessibility · 11 Notification Listener · 12 papel/default handler · 13 limites A8 · 14 limites A atual · 15 background restrictions · 16 bateria · 17 distribuição · 18 disclosure/consent · 19 confiabilidade real · 20 recomendação NextGuardian. `VALIDADO POR DOCUMENTAÇÃO OFICIAL` quando a resposta vem da doc Android/Google.

**Heartbeat/check-in periódico** — 1 sim · 2 WorkManager `PeriodicWorkRequest` · 3 não (INTERNET normal) · 4 não · 5 não · 6 não · 7 **sim (mecanismo primário)** · 8 não · 9 não · 10 não · 11 não · 12 não · 13 ok · 14 ok · 15 **mínimo 15 min, Doze/Standby adiam** · 16 baixa se adiável · 17 livre · 18 informar · 19 **não é tempo real** · 20 **usar; FCM data para latência**. (VALIDADO: WorkManager/Doze docs.)

**Push acordar device** — 1 sim · 2 FCM · 3 não · 4 não · 5 não (breve) · 6 não · 7 complementa · 8 não · 9 não · 10 não · 11 não · 12 não · 13 ok · 14 cota de high-priority · 15 data-only adia em Doze · 16 baixa · 17 livre · 18 — · 19 best-effort · 20 **sinal, nunca auth** (doc 26). (VALIDADO: FCM docs.)

**Localização background** — 1 parcial · 2 FusedLocation/Geofencing · 3 fine+`ACCESS_BACKGROUND_LOCATION` (grant separado A10+) · 4 não · 5 **sim (`location` type)** · 6 sim · 7 pode agendar · 8 não · 9 não · 10 não · 11 não · 12 não · 13 ok · 14 concessão separada + revisão · 15 **forte** · 16 média/alta · 17 **revisão de política Play** · 18 **consentimento versionado** (doc 27) · 19 SO pode suspender · 20 **CONDICIONAL, nunca prometer contínuo**. (VALIDADO: location/background docs.)

**Device Owner/Profile Owner (lock/wipe/policy)** — 1 condicional · 2 `DevicePolicyManager` · 3 não (é gestão) · 4 não · 5 n/a · 6 n/a · 7 n/a · 8 **sim (requisito)** · 9 pode gerir · 10 não · 11 não · 12 não · 13 várias APIs DA depreciando · 14 via DO/PO moderno · 15 gerencia background · 16 — · 17 **provisioning (afw/QR/zero-touch)** · 18 org · 19 confiável no contexto gerenciado · 20 **perfil Business apenas**. (VALIDADO: enterprise/DevicePolicyManager docs.)

**MediaProjection (captura de tela consentida)** — 1 sim · 2 `MediaProjection` · 3 não · 4 **consentimento por sessão (dialog do sistema)** · 5 **sim (`mediaProjection` type, A14+)** · 6 sim · 7 não · 8 não · 9 não · 10 não · 11 não · 12 não · 13 ok · 14 A14 exige FGS type + reconsentimento · 15 — · 16 alta · 17 livre se consentida/visível · 18 **consentimento explícito e visível** · 19 confiável só em sessão ativa · 20 **CONDICIONAL/FUTURO** (suporte remoto consentido; nunca silencioso). (VALIDADO: MediaProjection docs.)

**Play Integrity** — 1 sim · 2 Play Integrity API · 3 não · 4 não · 5 não · 6 não · 7 não · 8 não · 9 não · 10 não · 11 não · 12 não · 13 ok · 14 ok · 15 — · 16 baixa · 17 livre · 18 — · 19 sinal probabilístico · 20 **usar como fator de risco/integridade** (doc 16), não bloqueio absoluto. (VALIDADO: Play Integrity docs.)

**Inventário de dispositivo** — 1 sim (Build/versão) · 2 `Build`/`PackageManager` · 3 não p/ básico · 4 não · 5 não · 6 não · 7 pode coletar em worker · 8 não · 9 não · 10 não · 11 não · 12 não · 13 ok · 14 **IMEI/serial inacessíveis A10+**; visibilidade de pacotes restrita A11+ · 15 — · 16 baixa · 17 `QUERY_ALL_PACKAGES` restrita no Play · 18 — · 19 confiável p/ dados de `Build` · 20 **usar dados de `Build`; `<queries>` mínimo; sem IMEI/serial**. (VALIDADO: privacy/package-visibility docs.)

## E. Síntese de restrições que moldam a arquitetura

1. **Não há trabalho contínuo garantido** em Android moderno: Doze, buckets e limites de FGS regem tudo. → heartbeat adiável + FCM data para latência.
2. **Permissões restritas do Play** (SMS, call log, `QUERY_ALL_PACKAGES`, background location) exigem justificativa e podem barrar a publicação. → escopo mínimo.
3. **Gestão forte (lock/wipe/policy)** exige Device/Profile Owner com provisioning — não é ligável em um app comum já instalado. → tratar MDM como trilha própria e tardia.
4. **Accessibility/Notification Listener/root** são caminhos de vigilância clandestina → **excluídos** por política e por princípio.
5. **Identificadores de hardware** (IMEI/serial) são inacessíveis → usar `installationId` próprio.
