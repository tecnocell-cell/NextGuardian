# Autenticação: humana × agente — NextGuardian

Data: 2026-09-11. Documento de desenho (ADR-0010). São **dois sistemas distintos**, nunca a mesma credencial.

## 1. Autenticação humana (painel/console)

| Item | Decisão |
| --- | --- |
| Login | e-mail + senha (hash Argon2id/bcrypt no servidor) |
| Access token | JWT curto (ex.: 15 min), audiência `human`, claims: `userId`, `workspaceId` ativo, papel |
| Refresh token | opaco, rotacionado a cada uso; família invalidada em replay |
| Sessão | `Session` revogável; logout revoga refresh |
| Recuperação | fluxo de reset por e-mail (token de uso único, expira); política antifraude pendente |
| 2FA (futuro) | TOTP; recovery codes; não bloqueia MVP |
| Auditoria | login relevante, troca de papel, reset → `AuditLog` |

## 2. Autenticação do agente (dispositivo)

O agente **não** guarda senha do usuário. Fluxo de bootstrap:
```
código de ativação (autorização temporária, emitido à conta autenticada)
      → validate liga ticket ao installationId
      → pair cria pendência
      → confirm consome e emite credencial de dispositivo (prova de posse)
```

| Item | Decisão |
| --- | --- |
| Installation credential | par de chaves gerado no **Android Keystore** (não exportável); servidor guarda a pública. `confirmedOnDevice` atual é só UI → substituir por prova de posse |
| DeviceSession | access token curto de audiência `device` + refresh rotacionado; separado de conta e de FCM |
| Rotação | refresh rotacionado; chave de device rotacionável mediante re-enrollment |
| Revogação | `revoke` invalida DeviceSession e credencial; comandos/heartbeat passam a falhar auth |
| Expiração | access curto; refresh com prazo; credencial re-emitida por re-enrollment |
| Replay | nonce/timestamp + `serverReceivedAt`; idempotency keys |
| Segredo mestre | **nunca** embutir segredo mestre no APK; cada device tem sua própria chave |

## 3. Cenários adversos (obrigatórios no threat model, doc 18)

| Cenário | Efeito desejado |
| --- | --- |
| Access token roubado | expira rápido; escopo mínimo; refresh não acompanha |
| Refresh roubado | rotação detecta replay → invalida família |
| Device credential copiada | chave no Keystore não é exportável; cópia de token expira; re-enrollment revoga anterior |
| `installationId` clonado | `installationId` não autentica sozinho; precisa da chave; servidor detecta duas instalações e pode exigir re-enrollment |
| Aparelho restaurado (backup) | backup exclui dados sensíveis (já configurado); credencial não restaura → re-enrollment |
| App reinstalado | nova `Installation`; `Device` lógico persiste no workspace; trial não reinicia (autoridade do servidor) |

## 4. Estado atual
`DOCUMENTADO`/`CONTRATO`. Keystore só verifica alias (`IMPLEMENTADO / MOCK`); nenhuma emissão de credencial. Prova de posse e emissão entram na Fase 1A/2.
