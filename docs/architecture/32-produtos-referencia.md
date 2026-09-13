# Produtos de referência — estudo público — NextGuardian

Data: 2026-09-11. Somente informação **publicamente verificável** de produtos legítimos (parental/family safety e MDM/EMM). Classificação por origem da afirmação. O objetivo é colher boas ideias de UX, dashboard, status, alertas, relatórios, onboarding, assinatura e gestão.

## 1. Escala de confiança por afirmação
`MARKETING` (só divulgado) · `DOCUMENTADO` (doc oficial do produto) · `PLAUSÍVEL` (coerente com Android) · `VALIDADO` (confirmado por doc oficial Android) · `CONDICIONAL` (exige root/DO/PO/permissão especial) · `INCOMPATÍVEL` (fere princípios NextGuardian).

## 2. Categorias legítimas (fontes de boas ideias)

| Categoria | Exemplos públicos | Ideias aproveitáveis | Classificação |
| --- | --- | --- | --- |
| Parental / family safety | Google Family Link, Microsoft Family Safety | onboarding guiado, localização consentida, limites de tempo, transparência para o dependente | VALIDADO/PLAUSÍVEL |
| MDM / EMM | Android Enterprise, Intune, VMware WS1 | enrollment DO/PO, políticas, compliance, fleet dashboard | VALIDADO (CONDICIONAL a DO/PO) |
| Fleet / device management | Esper, SOTI | inventário, health, agrupamento, comandos remotos legítimos | PLAUSÍVEL/VALIDADO |
| Remote support | TeamViewer, AnyDesk | sessão **consentida e visível** de suporte | CONDICIONAL (consentimento explícito) |
| Endpoint posture | soluções de EDR/MDM | risk score explicável, patch level, integridade | PLAUSÍVEL |

Boas ideias de **UX/gestão** a incorporar: overview com contadores, timeline por device, alertas acionáveis com cooldown, onboarding com consentimento, assinatura clara, agrupamento/tags.

Regra: aproveitamos **organização de dashboard/relatórios/UX** de produtos legítimos, nunca mecanismos clandestinos. Nada que exija root, ocultação ou captura não consentida entra no produto (doc 19, Parte III).

## 4. Estado atual
`DOCUMENTADO` (pesquisa). Continua no [backlog de pesquisa](claude-research-backlog.md) (concorrentes).
