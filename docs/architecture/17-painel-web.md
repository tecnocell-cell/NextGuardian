# Painel Web — arquitetura funcional — NextGuardian

Data: 2026-09-11. Documento de desenho funcional. **Não** iniciar dezenas de telas; definir a estrutura e implementar por último (fase 7).

## 1. Princípios

- Multi-tenant desde a primeira tela: todo dado filtrado por `tenantId` do usuário autenticado; RBAC (owner/admin/operator/viewer) governa o que aparece e o que é acionável.
- O painel **lê** estado derivado e **enfileira** comandos legítimos; nunca acessa conteúdo privado.
- Estados apresentados em eixos separados (presença ≠ assinatura ≠ compliance), coerentes com o [DeviceState](12-devicestate-heartbeat.md).

## 2. Mapa de navegação

```
Overview
Devices ─┐
         └─ Device Detail ── [Overview | Timeline | Location | Policies | Commands | Alerts | Device Info]
Security ── [Sessões | Usuários | Responsáveis autorizados | 2FA | Auditoria]
Subscription ── [Plano | Validade | Limite de dispositivos | Trial | Cobrança]
Settings ── [Retenção | Notificações | Preferências | Privacidade | Exclusão/Revogação]
```

## 3. Telas

### Overview
Contadores: total de dispositivos; online; stale; offline; non-compliant; alertas críticos; trials/assinaturas; eventos recentes. Cada card leva à lista filtrada.

### Devices
Listagem/seleção com colunas: estado (presença), bateria, última comunicação (`lastSeen`), última sincronização (`lastSuccessfulSync`), versão do agente, política, risco. Filtros por presença/compliance/tags.

### Device Detail
- **Overview** — snapshot do `DeviceState` (eixos separados).
- **Timeline** — eventos ([doc 14](14-eventos-timeline.md)), filtráveis por tipo/severidade.
- **Location** — últimas posições consentidas + geofences ([doc 16](16-localizacao-inventario-risco.md)); indica claramente quando não há consentimento/posição recente.
- **Policies** — políticas aplicadas e status de compliance.
- **Commands** — histórico + enfileirar comandos do catálogo fechado ([doc 15](15-motor-regras-comandos.md)); mostra status/ACK/expiração.
- **Alerts** — alertas abertos/reconhecidos.
- **Device Info** — inventário/postura.

### Security
Sessões ativas (revogáveis), usuários e papéis, responsáveis autorizados, 2FA, e leitura da **auditoria** ([doc 18](18-seguranca-privacidade-threat-model.md)).

### Subscription
Plano, validade, limite de dispositivos, estado de trial e de cobrança. Servidor é autoridade; painel só exibe/gerencia dentro do RBAC.

### Settings
Retenção de eventos/localização, notificações, preferências, privacidade e **exclusão/revogação** (device e dados), coerente com LGPD.

## 4. Stack proposta (a confirmar na fase 7)

Next.js + React + TypeScript + Tailwind para o painel; consome a mesma API do agente. Nenhuma tela criada nesta rodada.

## 5. Estado atual

**NÃO EXISTE** (nenhum diretório web). Última trilha do [roadmap](implementation-roadmap.md), pois depende de device state, eventos, comandos e alertas já reais.
