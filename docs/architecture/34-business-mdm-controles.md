# Controles de gestão (Business/MDM) e console de frota — NextGuardian

Data: 2026-09-13. Documento de desenho. Capacidades **CONDICIONAIS** do perfil Business (ADR-0002/0014). Legítimas e padrão de mercado (gestão de dispositivo corporativo gerenciado), **não** clandestinas: exigem aparelho gerenciado, provisioning e **divulgação/consentimento**. Nada aqui autoriza ocultação, root ou evasão.

## 1. Pré-requisito comum (o portão técnico e legal)

Todos os controles fortes exigem que o aparelho seja **Device Owner (totalmente gerenciado)** ou **Profile Owner (perfil de trabalho)** via Android Enterprise (`DevicePolicyManager`). Isso implica:
- **Provisioning no setup** (QR / afw / zero-touch), a partir de fábrica ou factory reset. **Não** é ativável por um app comum em aparelho pessoal já configurado.
- **Propriedade/controle do aparelho** pela organização (ou responsável, no caso familiar que provisiona o aparelho que possui).
- **Divulgação + consentimento**: o usuário sabe que o aparelho é fornecido/gerenciado pela empresa, de uso relacionado ao trabalho, e que só a empresa faz modificações. Base legal obrigatória (CLT + LGPD) — validar com jurídico.

## 2. Controles solicitados (mapeados a APIs oficiais)

| Controle | API oficial (`DevicePolicyManager`/UserManager) | Efeito | Estado |
| --- | --- | --- | --- |
| Só a empresa instala apps | `DISALLOW_INSTALL_APPS`, `DISALLOW_INSTALL_UNKNOWN_SOURCES` + allowlist via managed Google Play / install policy | usuário não instala; admin distribui apps | CONDICIONAL (DO/PO) |
| Impedir desinstalação (inclui o agente) | `setUninstallBlocked(pkg,true)`, `DISALLOW_UNINSTALL_APPS` | usuário não desinstala apps gerenciados; **anti-desinstalação legítimo e visível** (o SO gerenciado bloqueia) | CONDICIONAL (DO/PO) |
| Impedir formatar / factory reset | `DISALLOW_FACTORY_RESET` + Factory Reset Protection | reset normal bloqueado; FRP prende o aparelho à conta da org | CONDICIONAL (DO) |
| Impedir modificações não autorizadas | `DISALLOW_CONFIG_*` (rede, contas, data/hora), `DISALLOW_SAFE_BOOT`, `DISALLOW_ADD_USER`, política de senha, etc. | conjunto de restrições configuráveis por política | CONDICIONAL (DO/PO) |

## 3. Limites honestos (não prometer o impossível)
- Nenhum controle é absoluto contra **ataque físico/recovery**. DO + FRP torna o reset não autorizado **muito difícil** e deixa o aparelho **preso à conta da org**; ainda assim, em alguns modelos um wipe forçado via recovery é possível — e aí o FRP bloqueia a reutilização.
- Profile Owner (BYOD/perfil de trabalho) controla **apenas o perfil corporativo**, não o aparelho todo; Device Owner (corporativo) controla o aparelho.
- Não usar esses controles para **impedir ciência/controle do usuário** — o app permanece **visível**; o bloqueio é do dispositivo gerenciado, declarado, não um truque.

## 4. Console de frota (parte web da empresa)

Estende o [painel completo (doc 17)](17-painel-web.md) e o [console mínimo (doc 33)](33-painel-operacional-minimo.md) com módulos Business, sempre escopados por `Workspace` (tenant = empresa):

| Módulo | Conteúdo |
| --- | --- |
| Enrollment/Provisioning | gerar QR / token afw / zero-touch; acompanhar adesão |
| Frota (Devices) | inventário, grupos/tags, estado, compliance, risco |
| Políticas | criar/versionar políticas (restrições da seção 2), aplicar por grupo |
| Comandos | catálogo fechado (checkin, sync, mensagem, tocar, localizar, **lock**, **wipe corporativo**), com ACK/expiração ([doc 15](15-motor-regras-comandos.md)) |
| Gestão de apps | allowlist, distribuir/bloquear instalação, bloquear desinstalação |
| Compliance/Alertas | conformidade vs política, alertas, risk score explicável |
| Auditoria | ações administrativas imutáveis ([doc 18](18-seguranca-privacidade-threat-model.md)) |
| Ponto (opcional) | relatórios de ponto, se o módulo do [doc 35](35-ponto-eletronico.md) estiver ativo |

## 5. Critérios de aceite (futuros WPs da trilha Business)
- Controles só aplicáveis quando o aparelho está em DO/PO; em aparelho não gerenciado, a operação falha com mensagem clara (não "tenta por baixo").
- Toda política/comando gera `AuditLog` (quem, quando, aparelho, resultado).
- App permanece visível; consentimento/divulgação registrados antes da aplicação.
- Isolamento por tenant mantido (empresa A não gerencia aparelho da empresa B).

## 6. Estado atual
`DOCUMENTADO`. Trilha **Business**, posterior ao MVP Family (ADR-0014). Requer frente de provisioning DO/PO. Sem código nesta rodada.
