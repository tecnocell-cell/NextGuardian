# Catálogo completo de funcionalidades — NextGuardian

Data: 2026-09-13. Referência oficial para implementação. Convenção: **[C]** Core · **[F]** Family/MVP · **[B]** Business/MDM. Estado: ✅ implementado · 🟡 mock/demo · ⬜ planejado.
Todas as capacidades aqui são **consentidas, visíveis e Play-compatíveis** — nada clandestino. Ver limites em [doc 19](19-decisoes-perguntas-nao-implementar.md).

## 0. Regra de ouro (o que garante não-bloqueio de app/conta/Play)
1. **Consentimento + prominent disclosure** antes de coletar qualquer dado.
2. **App sempre visível** (sem ocultar ícone; bloqueio de desinstalação só via MDM gerenciado e declarado).
3. **Data Safety** da Play preenchido honestamente.
4. **Permissões declaradas e justificadas**; foreground service com tipo correto.
5. **Sem** permissões restritas que não qualificamos (SMS/call log) e **sem** captura clandestina.
6. Biometria/localização tratadas como dado sensível (LGPD): consentimento explícito, minimização, preferência por processamento **on-device**.

## 1. Revisão dos itens originais — o que pode ser incorporado sem risco

| Item (da análise/propostas originais) | Veredito | Como (legítimo) |
| --- | --- | --- |
| Localização (fine/coarse) | ✅ INCORPORAR [F/B] | consentida, foreground service tipo `location` |
| Histórico de localização | ✅ INCORPORAR | retenção declarada, LGPD |
| Geofence (entrada/saída/permanência) | ✅ INCORPORAR | Geofencing API |
| Inventário do dispositivo | ✅ INCORPORAR | `Build`/`PackageManager`; sem IMEI/serial |
| Bateria/rede/telemetria | ✅ INCORPORAR | heartbeat técnico |
| **Uso de apps / tempo de tela** | ✅ INCORPORAR [F] | `PACKAGE_USAGE_STATS` (special access, consentido) — controle parental |
| **Limites de tempo / bloqueio de apps por horário** | ✅ INCORPORAR [F/B] | Family: agenda/limites; Business: via DO/PO |
| Bloquear (des)instalação de apps | ✅ INCORPORAR [B] | Device/Profile Owner |
| Bloquear factory reset / restrições de config | ✅ INCORPORAR [B] | Device Owner + FRP |
| Lock remoto / wipe corporativo | ✅ INCORPORAR [B] | DO/PO |
| Push (acordar/sync/comando) | ✅ INCORPORAR [C] | FCM como sinal, fetch autenticado |
| Captura de tela (suporte remoto) | ⚠️ CONDICIONAL [B] | MediaProjection **consentida e visível**, sessão pontual — nunca silenciosa |
| Filtro de conteúdo / navegação segura | ⚠️ FUTURO [F] | via DNS/VPN local consentido; **não** por abuso de Accessibility |
| **Reconhecimento facial (ponto/anti-fraude)** | ✅ INCORPORAR [B] | selfie iniciada pelo usuário + liveness **on-device**; LGPD |
| Ler SMS / registro de chamadas | ❌ EXCLUIR | permissão restrita da Play; fora de escopo |
| Ler contatos / agenda | ❌ EXCLUIR | não necessário |
| Notification Listener (ler notif. de terceiros) | ❌ EXCLUIR | conteúdo de terceiros |
| Accessibility para captura/automação | ❌ EXCLUIR | viola política; não é atalho |
| Câmera/mic ocultos, gravação de ambiente/chamada | ❌ EXCLUIR | clandestino / sem API |
| Keylogger, captura de IM | ❌ EXCLUIR | clandestino |
| Root/superuser, injeção dinâmica de código, ocultar ícone, anti-desinstalação oculta | ❌ EXCLUIR | fere Play/LGPD/princípio |

## 2. Web — Console do Super-Admin (operador do SaaS)
**Acesso:** login + 2FA, sessões revogáveis, papéis internos, auditoria imutável de operador ⬜
**Tenants:** criar/listar/buscar; ver perfil (INDIVIDUAL/FAMILY/BUSINESS); suspender/reativar/encerrar; limites por tenant; impersonation de suporte auditada ⬜
**Planos/billing/entitlements:** catálogo de planos configurável; trials; assinaturas (estado/grace/cancelamento); faturas/cobrança (futuro provedor); feature flags por tenant/plano ⬜
**Ecossistema:** métricas globais (tenants, devices, MRR); observabilidade (API, filas, entrega de comandos); versão mínima do agente; catálogo global de comandos/políticas; conformidade/retenção (LGPD); status/broadcast ⬜

## 3. Web — Console do Tenant (empresa/família) — RBAC owner/admin/operator/viewer
**Overview [C]:** contadores (total, online, recentes, offline, não-conformes, alertas, trial), eventos recentes ⬜
**Dispositivos [C]:** lista (estado, bateria, última comunicação/sync, versão, política, risco), filtros, tags/grupos ⬜
**Detalhe [C]:** Overview (eixos de estado) · Timeline · Localização (mapa/histórico/geofence, com honestidade de frescor) · Políticas/compliance · Comandos (histórico + enfileirar) · Alertas · Device Info/inventário ⬜
**Enrollment/Ativação [C]:** emitir/ver códigos; acompanhar vínculo; [B] provisioning QR/afw/zero-touch ⬜
**Segurança do tenant [C]:** usuários/papéis, sessões, 2FA, auditoria do tenant ⬜
**Assinatura [C]:** plano, validade, limite de devices, trial, cobrança ⬜
**Configurações [C]:** retenção, notificações, **privacidade/consentimento** (versões/propósitos), exclusão/revogação ⬜
**Regras & risco [C]:** regras (offline, bateria, geofence, permissão removida, agente desatualizado, não-conformidade) com cooldown; Device Risk Score explicável ⬜
**Family [F]:** mapa das crianças, geofences (casa/escola), **uso de apps/tempo de tela**, limites/agenda, alertas seguros, botão SOS, transparência ⬜
**Business [B]:** frota (grupos), políticas versionadas + enforcement; gestão de apps (allowlist, distribuir, bloquear (des)instalação); controles de dispositivo (lock, wipe, factory-reset block, restrições); **módulo de ponto** (seção 5) ⬜

## 4. Apps (agente Android)
**Onboarding/consentimento [C/F]:** boas-vindas + transparência 🟡; consentimento versionado ⬜; educação de permissões just-in-time ⬜
**Ativação/vínculo [C]:** código + erros claros 🟡; confirmação visível 🟡; prova de posse (Keystore) ⬜; unpair 🟡
**Status/transparência [C]:** última comunicação, bateria, rede, frescor, assinatura 🟡; painel de privacidade ⬜; aviso de agente desatualizado ⬜
**Telemetria [C]:** heartbeat (bateria/rede/versão) WorkManager+FCM 🟡→⬜
**Localização [C/F/B]:** consentida (foreground service `location`) ⬜; histórico; geofence; estados honestos ⬜
**Comandos (receptor) [C]:** sinal FCM → fetch autenticado → executar → ACK; checkin/sync/mensagem/tocar/atualizar/localizar/revogar ⬜
**Family [F]:** uso de apps/tempo de tela (UsageStats consentido) ⬜; limites/bloqueio por horário ⬜; SOS ⬜
**Business [B]:** enrollment DO/PO (QR) ⬜; aplicar políticas (bloqueio (des)instalação, factory reset, restrições) ⬜; **bater ponto** (seção 5) ⬜
**Persistência/segurança [C]:** DataStore ✅; credencial no Keystore ⬜

## 5. Módulo de Ponto Eletrônico — alvo "melhor que o mercado" [B]
Benchmark de mercado (facial+liveness, geofencing, offline, banco de horas, espelho, AFD, ajustes, integração folha) — ver [doc 35](35-ponto-eletronico.md) e fontes lá. Nosso diferencial: **privacidade (biometria on-device)**, **integridade (registros assinados/encadeados)** e **unificação** (mesmo agente faz gestão de dispositivo + ponto).

**Registro de ponto**
- Batida abertura / saída-almoço / volta-almoço / fechamento; foreground (tempo real real) ⬜
- **Modo offline-first**: registro local **assinado** + fila + sync ao reconectar ⬜
- Métodos: botão no app, sugestão por geofence, QR/NFC no local ⬜

**Anti-fraude (diferencial)**
- **Reconhecimento facial + liveness on-device** (anti "ponto amigo"); **template/hash**, sem subir rosto cru; consentimento LGPD explícito ⬜
- **Geofencing**: só registra dentro da área autorizada ⬜
- Detecção de mock/fake-GPS; vínculo à `Installation`; **horário do servidor** como autoridade ⬜

**Conformidade REP-P (Portaria MTP 671/2021)**
- **Imutabilidade** (encadeamento/hash), **comprovante** por batida ao trabalhador, **AFD/AEJ** exportáveis ⬜
- Correções só por **novo registro com trilha** ⬜

**Jornada & cálculo**
- Escalas/jornadas (6x1, 5x2, 12x36, flexível), intervalos, horas extras, **banco de horas**, DSR, adicional noturno ⬜

**Workflows & experiência**
- Ajustes/abonos/inclusões com **aprovação** (gestor/RH) ⬜
- **Espelho de ponto** e comprovantes ao trabalhador; lembretes/notificações ⬜
- Dashboard em tempo real (quem bateu, atrasos, extras) ⬜
- **Integração com folha** (export eSocial/TOTVS/SAP) ⬜

## 6. Ordem de implantação
Segue o [roadmap](implementation-roadmap.md) e os [work packages](codex-work-packages.md): Fase 0 (saneamento) → 1A (backend Core) → 1B (console mínimo) → 2 (DeviceState/heartbeat) → 3 (eventos) → 4 (comandos/FCM) → 5 (localização/geofence) → 6 (políticas/risco). Trilha Family = MVP; trilha Business (MDM + ponto) posterior. Cada item vira WP pequeno, compilável e testável.

## 7. Fontes de benchmark (ponto)
[mywork](https://www.mywork.com.br/blog/aplicativo-de-ponto-eletronico) · [Let's Work](https://www.letswork.com.br/controle-de-ponto/) · [Solides](https://solides.com.br/blog/app-de-controle-de-ponto-com-reconhecimento-facial/) · [UsePonto REP-P](https://useponto.com.br/blog/rep-p-o-que-e-como-funciona) · [Pontomais 2.0](https://apps.apple.com/us/app/pontomais-2-0/id1536651077) · [TOTVS Meu Ponto — espelho](https://centraldeatendimento.totvs.com/hc/pt-br/articles/33401445608727) · [PontoSoft REP-P/REP-A](https://www.pontosoft.com.br/ponto-eletronico-mobile) · [Apponte.me](https://apponte.me/funcionalidades-apponte-me/)
