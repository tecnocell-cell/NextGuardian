# Módulo de Ponto Eletrônico — NextGuardian

Data: 2026-09-13. Documento de desenho. Capacidade do perfil **Business**, sobre o Core (eventos + localização + auditoria). **Não é conselho jurídico** — o ponto eletrônico é regulado e exige validação por contador/advogado trabalhista.

## 1. Viabilidade técnica: sim

A batida é um **evento em foreground iniciado pelo funcionário** — portanto é genuinamente em tempo real (não depende de background contínuo). No momento da batida, captura-se localização + timestamp, com o **servidor como autoridade temporal** (relógio do aparelho não define o horário oficial).

## 2. Alerta regulatório (Brasil) — obrigatório entender antes de implementar

Ponto eletrônico é regulado pela **Portaria MTP nº 671/2021**, que define modalidades de Registrador Eletrônico de Ponto (REP). Um app/nuvem enquadra-se como **REP-P (via Programa)**. Ser REP-P legal implica, entre outros requisitos que devem ser confirmados com especialista:
- **AFD (Arquivo Fonte de Dados)** exportável no layout oficial;
- **comprovante de registro** entregue ao trabalhador a cada batida (físico ou eletrônico);
- **imutabilidade** dos registros — sem edição/exclusão sem trilha auditável;
- integridade/assinatura dos dados e requisitos de certificação do programa;
- tratamento de correções via mecanismo próprio, não sobrescrevendo o original.

Geolocalização na batida é **permitida**, desde que **divulgada, consentida e proporcional** (LGPD + relação de trabalho). **Conclusão:** é um módulo de **conformidade**, não apenas "salvar horário". Enquanto essa conformidade não for validada, tratar como "registro de jornada auxiliar", não como ponto legal oficial.

## 3. Modelo (proposta)

```
PunchEvent {                       // append-only, imutável
  punchId, workspaceId, userId, deviceId, installationId
  type: CLOCK_IN | LUNCH_OUT | LUNCH_IN | CLOCK_OUT
  clientTimestamp                  // informativo
  serverReceivedAt                 // autoridade
  location: { lat, lng, accuracy, source } | null   // consentida
  consentVersion
  receiptId                        // referência ao comprovante emitido
  integrityHash                    // encadeamento p/ imutabilidade (AFD futuro)
}
```
- Deriva de `Event`/`LocationSample` do Core ([doc 14](14-eventos-timeline.md), [doc 16](16-localizacao-inventario-risco.md)); comprovante e AFD são artefatos próprios do módulo.
- Correções geram **novo** registro com trilha, nunca editam o original.

## 4. Fluxo
```
Funcionário abre o app (foreground) → escolhe a batida (abertura/almoço/fechamento)
   → app captura localização consentida + envia
   → servidor grava serverReceivedAt (autoridade) + emite comprovante
   → registro imutável na timeline + base do AFD
```

## 5. Critérios de aceite (futuros WPs)
- Servidor é autoridade temporal; relógio do aparelho não define horário oficial.
- Registros imutáveis; correção só por novo registro com trilha.
- Comprovante ao trabalhador por batida; AFD exportável no layout oficial.
- Localização só com consentimento vigente; divulgação registrada.
- Isolamento por tenant; auditoria de acessos administrativos.

## 6. Diferenciais para superar o mercado (benchmark 2026)

Apps líderes (Pontomais, Ahgora/TOTVS, TiqueTaque, Ponto Web, PontoSoft) convergem em: **facial + liveness** (anti "ponto amigo"), **geofencing** (só bate na área), **modo offline** com sync, **banco de horas/escalas**, **espelho de ponto + AFD/AEJ**, **ajustes/abonos com aprovação** e **integração com folha**. Isso é o **piso**. Nossos diferenciais:

- **Privacidade por arquitetura:** reconhecimento facial + liveness **on-device**; guardar apenas **template/hash**, nunca o rosto cru — reduz risco LGPD (biometria = dado sensível) e é edge sobre concorrentes que sobem imagem.
- **Integridade forte:** registros de ponto **assinados e encadeados** (hash chain) desde o offline — imutabilidade real para REP-P, verificável.
- **Unificação:** o **mesmo agente** faz gestão de dispositivo (MDM) + ponto — concorrentes de ponto não gerenciam o aparelho; MDMs não fazem ponto conforme.
- **Anti-fraude combinado:** geofence + liveness + detecção de mock/fake-GPS + vínculo à `Installation` + horário do servidor.
- **Tempo real de verdade:** batida é evento em foreground; dashboard ao vivo pelo mesmo pipeline de eventos do Core.

Recursos a cobrir (checklist em [doc 36 §5](36-catalogo-funcionalidades.md)): métodos de batida (app/geofence/QR-NFC), offline-first assinado, facial on-device, escalas (6x1/5x2/12x36/flex), intervalos, extras, banco de horas, DSR, noturno, ajustes/abonos com aprovação, espelho + comprovante, AFD/AEJ, integração folha (eSocial/TOTVS/SAP), dashboard em tempo real.

## 7. Fontes (benchmark)
[mywork](https://www.mywork.com.br/blog/aplicativo-de-ponto-eletronico) · [Let's Work](https://www.letswork.com.br/controle-de-ponto/) · [Solides — facial](https://solides.com.br/blog/app-de-controle-de-ponto-com-reconhecimento-facial/) · [UsePonto — REP-P](https://useponto.com.br/blog/rep-p-o-que-e-como-funciona) · [Pontomais 2.0](https://apps.apple.com/us/app/pontomais-2-0/id1536651077) · [TOTVS — espelho de ponto](https://centraldeatendimento.totvs.com/hc/pt-br/articles/33401445608727) · [PontoSoft](https://www.pontosoft.com.br/ponto-eletronico-mobile) · [Apponte.me](https://apponte.me/funcionalidades-apponte-me/)

## 8. Estado atual
`DOCUMENTADO`. Perfil **Business**, posterior ao MVP. Conformidade REP-P (Portaria 671/2021) e tratamento de biometria (LGPD) são **DECISÃO/VALIDAÇÃO PENDENTE** com especialista antes de valer como ponto oficial.
