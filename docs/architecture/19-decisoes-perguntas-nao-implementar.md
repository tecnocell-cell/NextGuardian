# Decisões arquiteturais, perguntas em aberto e o que NÃO implementar

Data: 2026-09-11. Documento de governança da rodada de consolidação.

## Parte I — Decisões arquiteturais (ADRs resumidos)

| # | Decisão | Razão | Consequência |
| --- | --- | --- | --- |
| AD-01 | Preservar a fundação Android atual (Kotlin/Compose, minSdk 26, fluxo Welcome→Settings, DataStore, Keystore, domínio) | Já aprovada, testada e limpa | Novas trilhas **estendem**, não reescrevem |
| AD-02 | Servidor é a única autoridade de trial/assinatura/tempo | Relógio do device não é confiável | Fase 1 obrigatória antes de tudo |
| AD-03 | Nascer multi-tenant; `Account` → `Tenant`; RBAC owner/admin/operator/viewer | Isolamento por cliente serve tanto famílias quanto organizações (um tenant pode ser uma família ou uma empresa) | Todo dado com `tenantId`; testes de isolamento |
| AD-15 | **NextGuardian Core + perfis** (Family/Responsible e Business/MDM) sobre backend único | Não travar em um só mercado; sem duplicar backend | `Tenant.profile` ativa feature flags/módulos; ver [doc 13](13-modelo-produto-core-perfis.md) |
| AD-16 | Planos, limites e trial como **dado configurável** (`Plan`/`Subscription`), não hard-coded | Adiar decisão comercial sem custo arquitetural | Trial/limite/preço definidos por perfil/plano depois |
| AD-04 | Estado do device em eixos ortogonais (presença ≠ assinatura ≠ compliance ≠ conectividade) | Evitar "connected por vínculo" | `DeviceState` derivado no servidor |
| AD-05 | Heartbeat adiável (WorkManager) + FCM data para latência | Restrições de background do Android | Sem polling agressivo, sem FGS permanente |
| AD-06 | Timeline append-only com taxonomia de eventos e retenção por classe | Auditoria + dashboard + alertas | Dimensionar volume antes de implementar |
| AD-07 | Command center com catálogo **fechado**, idempotência, ACK, expiração | Entrega best-effort; segurança | Nada de comando de código arbitrário |
| AD-08 | Motor de regras `TRIGGER+CONDITIONS+ACTIONS` sobre postura/eventos | Alertas explicáveis | Nunca sobre conteúdo privado |
| AD-09 | Device Risk Score explicável, fatores objetivos, pesos configuráveis | Confiança do admin | Cada ponto tem razão legível |
| AD-10 | FCM apenas sinaliza; token ≠ autenticação | Segurança | Toda operação reautentica na API |
| AD-11 | Sem Accessibility/Notification Listener/Device Admin/root na base | Política Play + LGPD + princípio | MDM forte é trilha lateral com DO/PO |
| AD-12 | Identidade por `installationId` próprio; sem IMEI/serial | Inacessível/privacidade | Trial anti-abuso resolvido por conta no servidor |
| AD-13 | Produto greenfield: nenhum artefato de terceiros reutilizado (código, chaves, endpoints) | Desenho próprio, do zero | — |
| AD-14 | Ordem do roadmap: backend → device state → eventos → comandos → localização → políticas/risco → painel | Dependências reais | Fase 1 destrava as demais |

## Parte II — Perguntas ainda sem resposta

**Comercial/produto**
1. Elegibilidade de trial e limite de dispositivos por plano — regra exata? *(Não bloqueante: modelado como dado configurável em `Plan`/`Subscription`, AD-16; valores podem ser decididos depois.)*
2. ~~NextGuardian é parental, corporativo (MDM) ou ambos?~~ **RESOLVIDA (AD-15):** ambos, via **Core + perfis** (Family/Responsible e Business/MDM) sobre backend único. DO/PO é capacidade do perfil Business, não decide a arquitetura do Core. Ver [doc 13](13-modelo-produto-core-perfis.md).
3. Provedor de pagamento e modelo de cobrança? *(Adiável — `Subscription` guarda estado; integração de pagamento entra quando houver decisão.)*
4. Verificação de e-mail/antifraude no cadastro — política final?
4b. ~~Quais perfis lançam primeiro no MVP?~~ **RESOLVIDA (ADR-0014):** MVP = **Family/Responsible**; Business/MDM é perfil posterior sobre o mesmo Core. Falta detalhar apenas o conjunto mínimo de capacidades Family do MVP (deriva do [doc 13](13-modelo-produto-core-perfis.md) §3).

**Técnico**
5. Store de eventos: relacional particionado vs. append-only dedicado — decidir após estimar volume real.
6. Intervalo padrão de heartbeat por plano (15 min? 60 min?) e limiares de presença por tenant.
7. Projeto Firebase próprio: quando criar, como gerir rotação de token.
8. Play Integrity: entra em qual fase para alimentar `integrity`/risk score?
9. Estratégia de background location frente à revisão de política do Play — vale o custo?
10. minSdk 26 confirma o público? Android 8 físico ainda não foi testado (só emulador 17).

**Privacidade/legal**
11. Bases legais LGPD por tipo de dado; retenção definitiva de localização.
12. Consentimento versionado: fluxo de captura, atualização e revogação.

## Parte III — Classificação individual de capacidades controversas

**Não** rotulamos genericamente como "proibido por Play + LGPD". Cada capacidade é classificada pelos eixos abaixo, com a razão real. Isso **não** autoriza mecanismos clandestinos, root, evasão, ocultação ou captura não consentida — a arquitetura é desenho próprio.

Eixos de restrição (uma capacidade pode combinar vários):
- **(a) Impossibilidade técnica** — não existe caminho no Android.
- **(b) Restrição de API** — API removida/limitada por versão.
- **(c) Distribuição Play** — política do Google Play barra/limita a publicação.
- **(d) Permissão especial** — runtime perigosa ou *special access* concedida pelo usuário.
- **(e) Papel/default handler** — exige ser default (SMS/dialer) ou papel específico.
- **(f) Device Owner / Profile Owner** — exige provisioning MDM.
- **(g) Consentimento** — exige consentimento explícito/versionado.
- **(h) Decisão de produto** — poderíamos, mas depende de decisão/perfil.
- **(i) Não queremos oferecer** — recurso que o produto opta por não ter.

Veredito: **PROIBIDO** (nunca) · **CONDICIONAL** (só sob perfil/papel/consentimento legítimos) · **DIFERIDO** (decisão de produto pendente).

| Capacidade | Eixos | Veredito | Razão / caminho legítimo |
| --- | --- | --- | --- |
| Ler SMS (`READ_SMS`) | c, e, g | CONDICIONAL | Play restringe a apps default de SMS; exigiria ser *default SMS handler* + consentimento. Não ofertado hoje (h); jamais oculto. |
| Ler call log (`READ_CALL_LOG`) | c, e, g | CONDICIONAL | Restrita a default dialer/phone role + consentimento. Mesma condição do SMS. |
| Ler contatos (`READ_CONTACTS`) | d, g, h | DIFERIDO | Tecnicamente possível com permissão + consentimento; não é necessário à gestão de dispositivo. |
| Ler calendário (`READ_CALENDAR`) | d, g, h | DIFERIDO | Idem; sem uso definido no produto. |
| Notification Listener (notif. de terceiros) | d, c, i | PROIBIDO (base) | É leitura de conteúdo de terceiros; fora do princípio de consentimento. Não ofertar. |
| Accessibility para automação/leitura de tela | d, c, i | PROIBIDO | Play limita acessibilidade a fins de acessibilidade; usar para monitorar viola política. Não usar como atalho. |
| Câmera remota silenciosa | d, g, i | PROIBIDO | Captura clandestina. (Um recurso "encontrar/foto" consentido e visível seria outra coisa, fora de escopo agora.) |
| Microfone / gravação de ambiente remota | d, b, i | PROIBIDO | Clandestino; A10+ restringe mic em background. |
| Gravação de chamada | a, b | PROIBIDO (por impossibilidade) | Sem API oficial desde Android 10; só via abuso de acessibilidade/root — inaceitável. |
| Keylogger / captura de digitação | a, b, i | PROIBIDO | Sem API; exigiria abuso de acessibilidade. |
| Captura de conteúdo de IM (WhatsApp etc.) | a, b, c, i | PROIBIDO | Sem API; tipicamente exige root. |
| Root / superuser | a, i | PROIBIDO | Indisponível a app normal; infraestrutura clandestina. |
| `WRITE_SECURE_SETTINGS` | b, f | CONDICIONAL | Não concedível a app comum; só em contexto DO/PO legítimo. |
| Injeção dinâmica de código | c, i | PROIBIDO | Play proíbe código dinâmico enganoso. |
| Ocultar ícone / anti-desinstalação clandestina | c, i | PROIBIDO | Play proíbe ocultar ícone e comportamento enganoso. (Controle de desinstalação **gerenciado por DO** no perfil Business é (f) legítimo e visível.) |
| Localização em background / geofence | d, c, g | CONDICIONAL | `ACCESS_BACKGROUND_LOCATION` separada + revisão de política Play + consentimento versionado. Ofertável nos dois perfis, sem prometer continuidade. |
| Rastreamento contínuo "garantido" | a-parcial, i | PROIBIDO (como promessa) | Android não garante; ofertar só best-effort consentido. |
| Lista de apps instalados / `QUERY_ALL_PACKAGES` | b, c, h | CONDICIONAL | Visibilidade restrita A11+; Play limita `QUERY_ALL_PACKAGES`. Usar `<queries>` mínimo; inventário amplo só no perfil Business via managed config. |
| Ser default SMS/dialer handler | e, c, h | DIFERIDO | Caminho legítimo para funções de SMS/telefonia; decisão de produto/perfil, nunca oculto. |
| `LOCK_DEVICE` / `WIPE_CORPORATE_DATA` | f, g | CONDICIONAL | Só via Device/Profile Owner com provisioning e consentimento organizacional (perfil Business). |
| Bloquear (des)instalação de apps | f, g, h | CONDICIONAL | `DISALLOW_INSTALL/UNINSTALL_APPS`, `setUninstallBlocked`; só DO/PO, aparelho corporativo divulgado. Anti-desinstalação **legítimo e visível**, não oculto ([doc 34](34-business-mdm-controles.md)). |
| Bloquear factory reset / formatação | f, g | CONDICIONAL | `DISALLOW_FACTORY_RESET` + FRP; só DO. Não absoluto contra recovery físico. |
| Restrições de configuração do aparelho | f, g | CONDICIONAL | `DISALLOW_CONFIG_*`/`SAFE_BOOT`/`ADD_USER` etc.; só DO/PO, divulgado. |
| Ponto eletrônico com geolocalização | g, h + regulatório | CONDICIONAL | Legítimo como REP-P (Portaria MTP 671/2021); exige AFD, comprovante, imutabilidade, consentimento ([doc 35](35-ponto-eletronico.md)). |
| Detecção de troca de SIM/eSIM | d, b | CONDICIONAL/PARCIAL | `READ_PHONE_STATE`; identificadores restritos em versões recentes → best-effort com consentimento. |
| Isenção de otimização de bateria / overlay (`SYSTEM_ALERT_WINDOW`) | c, h | DIFERIDO | Play restringe; evitar por padrão, avaliar só com justificativa clara. |
| Comando de execução de código arbitrário | i | PROIBIDO | Catálogo de comandos é fechado ([doc 15](15-motor-regras-comandos.md)). |
| Reutilizar artefatos de terceiros | i | PROIBIDO | Greenfield (AD-13): nada de código, recursos, IDs, certificados, endpoints, protocolos de terceiros. |
| Decidir trial/assinatura no cliente | i | PROIBIDO | Servidor é autoridade (AD-02). |
| Coletar IMEI/serial | b, i | PROIBIDO | Inacessível a app normal; identidade por `installationId`. |

**Regra transversal:** nenhuma capacidade "CONDICIONAL" ou "DIFERIDO" pode ser implementada de forma oculta, sem consentimento ou fora do perfil/papel apropriado. "CONDICIONAL" ≠ autorização — significa que existe um caminho legítimo, a ser decidido explicitamente.

## Parte IV — O que já existe e não deve ser refeito

Fundação Android compilável e testada; domínio (enums, `PairingTransitions`, `ActivationValidator`, `Subscription`); separação de estados; DataStore/Keystore preparados; contratos OpenAPI dos 10 endpoints; normas de segurança já escritas. Ver [inventário](11-inventario-estado-real.md).
