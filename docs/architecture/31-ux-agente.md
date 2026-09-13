# UX do agente Android — revisão — NextGuardian

Data: 2026-09-11. Documento de desenho. Fluxo atual (`IMPLEMENTADO / MOCK`): Welcome → Activation → Pairing → Status → Settings. Revisão por **necessidade real**, não estética.

## 1. Necessidades por etapa

| Etapa | Necessidade real | Estado atual | Recomendação |
| --- | --- | --- | --- |
| Welcome | explicar propósito e transparência; quem gerencia | tela existe | reforçar transparência (perfil Family: dizer o que é coletado e por quê) |
| Consentimento | ato informado versionado (doc 27) | ausente | **adicionar** passo de consentimento antes de permissões |
| Permissions education | por que cada permissão, antes de pedir | `feature/permissions` reservado (vazio) | telas educativas; pedir só o necessário, no momento do uso |
| Activation | inserir código, erros claros | existe (NEX-48H/EXPIRADO) | manter; mensagens de erro por tipo (`INVALID`/`EXPIRED`) |
| Pairing | confirmar vínculo visível | existe | manter; futura prova de posse (doc 22) |
| Status | lastSeen, bateria, rede, frescor, assinatura | existe (mock, rolável) | quando heartbeat real: mostrar frescor e "última sincronização" honestos |
| Erro/retry/offline | estados explícitos, sem travar | parcial | padrão de estados (loading/erro/offline/retry) |
| Revogação/unpair | encerrar vínculo com confirmação | existe (Settings) | manter; explicar consequência |
| Atualização | avisar agente desatualizado | ausente | banner quando `agentVersion < mínimo` |
| Privacidade/transparência | ver o que é coletado, exclusão | parcial (Settings) | painel de privacidade + exclusão de dados |
| Status de serviço | saber se está ativo/funcionando | Status | honesto: nunca "ONLINE" fixo se derivável de timestamps |

## 2. Princípios de UX
- **Transparência acima de tudo**: nada oculto, ícone visível, o usuário sabe que há gestão.
- Pedir permissões **just-in-time**, com educação prévia; degradar com elegância se negada.
- Estados honestos: distinguir "vinculado", "com direito", "online", "sincronizado", "compliant" (doc 12).

## 3. Estado atual
Fluxo base `IMPLEMENTADO / MOCK`. `feature/permissions` `PLANEJADO`. Consentimento/privacidade a projetar. **Não redesenhar por estética**; mudanças acompanham backend/heartbeat reais.
