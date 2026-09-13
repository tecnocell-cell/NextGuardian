# Modelo de produto: NextGuardian Core + perfis — NextGuardian

Data: 2026-09-11. Documento de desenho. Corrige uma premissa anterior: **não está decidido que o NextGuardian seja exclusivamente B2B/MDM.** A arquitetura deve comportar mais de um mercado sobre uma base única, sem duplicar backend.

## 1. Estrutura em camadas

```
                 ┌─────────────────────────────┐
                 │  Perfil FAMILY / RESPONSIBLE │   ┌───────────────────────┐
                 └─────────────┬───────────────┘   │  Perfil BUSINESS / MDM │
                               │                    └───────────┬───────────┘
                               └──────────┬─────────────────────┘
                               ▼          ▼
                 ┌─────────────────────────────────────────────┐
                 │            NEXTGUARDIAN CORE                 │
                 │  backend único, entidades e serviços comuns  │
                 └─────────────────────────────────────────────┘
```

- **Core** é profile-agnóstico: um só backend, um só modelo de dados, um só conjunto de serviços.
- **Perfil** é um atributo do `Tenant` (e/ou do workspace) que ativa *feature flags*, políticas padrão, fluxos de consentimento, subconjunto do catálogo de comandos, módulos do painel e conjuntos de papéis.
- **Não há duplicação de backend.** Um perfil é configuração + módulos específicos sobre o Core, nunca uma segunda API.

## 2. O que pertence ao Core (compartilhado)

**Entidades:** `Tenant` (com `profile`), `User`, `Membership`/RBAC, `Device`, `Enrollment`, `ActivationCode`, `Subscription`, `Plan`, `DeviceSession`, `DeviceState`/`DevicePosture`, `Event`, `Alert`, `Rule`, `Command`, `Policy`, `AuditLog`.

**Serviços:** autenticação e sessão; gestão de tenant/usuários; enrollment/ativação; ingestão de heartbeat/telemetria; plataforma de eventos/timeline; command center (comandos de núcleo); motor de regras/alertas; device risk score; assinatura/billing (planos e limites **configuráveis como dado**); auditoria; notificação.

Tudo em [doc 12](12-devicestate-heartbeat.md), [14](14-eventos-timeline.md), [15](15-motor-regras-comandos.md), [16](16-localizacao-inventario-risco.md), [18](18-seguranca-privacidade-threat-model.md) é **Core**, salvo o marcado abaixo como específico de perfil.

## 3. Perfil Family / Responsible

Gerenciamento **consentido** de dispositivos familiares/de responsáveis.

| Aspecto | Definição |
| --- | --- |
| Enrollment | App instalado no aparelho do dependente, com consentimento do responsável e ciência de quem usa o aparelho; sem Device Owner por padrão |
| Consentimento | Fluxo próprio (responsável + portador), versionado; nada oculto |
| Capacidades típicas | DeviceState, localização + geofence (consentidas), alertas seguros (offline, bateria, saída de geofence, permissão revogada), `RING_DEVICE`, `SHOW_MESSAGE`, "encontrar dispositivo", inventário mínimo, assistência |
| Não inclui | `LOCK_DEVICE`/`WIPE_CORPORATE_DATA` empresarial, enforcement forte de política |
| Papéis | Adaptados (ex.: responsável = admin do tenant familiar; membros) |
| Painel | Módulos orientados à família (mapa, alertas, lista de dispositivos) |

## 4. Perfil Business / MDM

Organizações, frota de dispositivos, compliance.

| Aspecto | Definição |
| --- | --- |
| Enrollment | Provisioning como Device Owner / Profile Owner (afw/QR/zero-touch) |
| Consentimento | Organizacional; aparelho corporativo ou perfil de trabalho |
| Capacidades adicionais | Políticas e **enforcement** de compliance, `LOCK_DEVICE`, `WIPE_CORPORATE_DATA`, **controles de gestão** (bloquear (des)instalação, bloquear factory reset, restrições de configuração), inventário de apps via managed config, dashboards de frota, **ponto eletrônico** (opcional) |
| Papéis | RBAC completo (owner/admin/operator/viewer), possivelmente mais granular |
| Painel | Console de frota: enrollment/QR, políticas, comandos, gestão de apps, compliance, auditoria ([doc 34](34-business-mdm-controles.md)) |
| Detalhes | Controles de gestão em [doc 34](34-business-mdm-controles.md); ponto eletrônico em [doc 35](35-ponto-eletronico.md) |

## 5. Matriz Core × perfil (capacidades)

| Capacidade | Core | Family | Business |
| --- | --- | --- | --- |
| Auth, tenant, RBAC, enrollment, ativação, trial | ✔ base | herda | herda |
| Heartbeat / DeviceState / posture | ✔ | ✔ | ✔ |
| Timeline de eventos / auditoria | ✔ | ✔ | ✔ |
| Comandos de núcleo (checkin, sync, show, ring, refresh, revoke) | ✔ | ✔ | ✔ |
| Motor de regras / alertas / risk score | ✔ | ✔ | ✔ |
| Localização + geofence (consentida) | mecanismo no Core | ✔ (consentimento familiar) | ✔ (política org.) |
| `REQUEST_LOCATION` | catálogo Core | ✔ com consentimento | ✔ com política |
| `LOCK_DEVICE` / `WIPE_CORPORATE_DATA` | catálogo Core (gated) | ✖ | ✔ (DO/PO) |
| Bloquear (des)instalação / factory reset / config | — | ✖ | ✔ (DO/PO, [doc 34](34-business-mdm-controles.md)) |
| Enforcement forte de política | interface no Core | limitado | ✔ (DO/PO) |
| Ponto eletrônico (REP-P) | eventos+localização no Core | ✖ | ✔ opcional ([doc 35](35-ponto-eletronico.md)) |
| Billing/planos/limites | ✔ (configurável) | perfil de planos próprio | perfil de planos próprio |

## 6. Configurabilidade (evita travar mercado e preço)

`Plan` e `Subscription` guardam limites e features **como dado** (contagem de dispositivos, duração de trial, flags de capacidade), não hard-coded. Assim, trial, limite de dispositivos e pagamento podem ser decididos depois, por perfil/plano, sem mudança de arquitetura. Ver perguntas em aberto revisadas em [doc 19](19-decisoes-perguntas-nao-implementar.md).

## 7. Desenho próprio (greenfield)

Perfis e Core são desenho próprio, do zero. Nada aqui autoriza root, evasão, ocultação ou captura não consentida. As capacidades sensíveis continuam classificadas individualmente em [doc 19, Parte III](19-decisoes-perguntas-nao-implementar.md).

## 8. Estado atual

**SOMENTE DOCUMENTADO.** O código atual (`Account`) já é compatível: `Account`→`Tenant` ganha um campo `profile`. Nenhuma implementação nesta rodada.
