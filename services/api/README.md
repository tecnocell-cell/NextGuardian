# NextGuardian API — WP-102

Monólito modular com bootstrap WP-101 e persistência base WP-102. Única rota: `GET /health` → HTTP 200, `{"status":"ok"}`. É liveness do processo; não verifica banco, autenticação, dispositivos ou prontidão comercial. Rota operacional separada do OpenAPI de negócio, que permanece intacto.

Node 24, TypeScript 5.9, NestJS 12 (adaptador Express padrão), Zod, dotenv e pino/pino-http. Jest + supertest. Versões exatas transitivas em package-lock.json. TypeScript 7 não foi adotado porque ts-jest exige versão inferior a 7.

```powershell
npm ci
npm run build
npm run typecheck
npm run lint
npm test
npm start
```

Configuração opcional em `.env` (copiar `.env.example`). NODE_ENV: development/test/production; HOST: loopback por padrão; PORT: inteiro 1..65535; LOG_LEVEL: níveis pino ou silent. Valores inválidos impedem startup. DATABASE_URL é opcional para `/health` e obrigatória para operações de persistência/migrations. Validação PostgreSQL via o mesmo schema Zod; nenhum segredo padrão.

Logs JSON possuem requestId gerado pelo servidor, X-Request-Id na resposta e correlationId (UUID recebido válido ou requestId). Não registram query, URL, cabeçalhos, cookies ou corpo. Nenhum desses IDs autentica ou determina Workspace. Sem audit log de negócio nesta fase.

```powershell
docker build -t nexguardian-api:wp101 .
docker run --rm -p 127.0.0.1:3000:3000 nexguardian-api:wp101
```

Imagem executa como usuário node e define healthcheck. Tag Node 24 acompanha patches; release reproduzível por digest é pendência de CI futuro. Sem deploy/produção/CI nesta rodada.

ADR-0003: Workspace é o limite de isolamento; accountId do contrato existente é preservado. O repositório de Workspace/Membership exige workspaceId explícito e foi testado contra PostgreSQL real. Não há controller público: contexto autenticado e autorização HTTP pertencem ao WP-103. Não confundir escopo de repositório com autenticação.

ADR-0012: PostgreSQL/Prisma implementados somente para Workspace, User e Membership no WP-102. Sem Auth, endpoints de negócio ou Compose de banco. Android e contratos não alterados; WP-103 não iniciado.

ESM: NestJS 12 usa ESM; tsconfig NodeNext e imports .js. npm test usa VM Modules (aviso experimental do Node/Jest, testes aprovados). Override Multer 2.3.0 corrige dependência transitiva 2.2.0 do Nest; revisar quando upstream atualizar. [Relatório WP-101](../../docs/architecture/wp-101-bootstrap-report.md).


## Persistência WP-102

`prisma/schema.prisma` usa os nomes do doc 21, com naming padrão Prisma (sem camada de mapeamento). Workspace tem profile explícito INDIVIDUAL/FAMILY/BUSINESS e status; User é global; Membership tem PK composta workspaceId/userId, role e status. FKs restritivas evitam remoção implícita; email tem UNIQUE exato do PostgreSQL, sem política de canonicalização de login antecipada. passwordHash é nullable, sem senha/hash real ou autenticação implementada. O futuro login não pode aceitar um usuário sem credencial válida.

Profile não é editável pelo repositório; não existe trigger de imutabilidade contra SQL privilegiado. Não há RLS. Isolamento comprovado é o das consultas/mutações do repositório escopado, com usuário de banco não superuser. Chamadores internos precisam obter contexto confiável antes de chamar forWorkspace; aceitar workspaceId de cliente sem autorização seria incorreto. User não ganha workspaceId porque é explicitamente global no doc 21; somente Membership liga usuário e workspace. Não há acesso global a usuários exportado pelo módulo.

WorkspaceDatabase é interno ao módulo; o único provider exportado é WorkspaceRepository. Conexão/pool inicializados apenas quando a persistência é solicitada e encerrados ao destruir o módulo Nest. Health permanece liveness, sem depender de banco.

```powershell
npm ci
npm run db:generate
npm run db:validate
# Para um banco de desenvolvimento autorizado: definir DATABASE_URL no ambiente.
npm run db:migrate
```

Migration inicial: `20260912000100_workspace_base`. Gerada por `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`; aplicar com `migrate deploy` (não usar db push/reset). O client é gerado em src/generated/prisma, ignorado pelo Git e compilado em dist/generated. prebuild/pretypecheck/pretest/pretest:integration geram o client. Dockerfile copia schema/config no estágio de build; não executa migrations automaticamente ao iniciar ; operação administrativa de migrations permanece separada do startup.

## Integração com PostgreSQL efêmero

```powershell
$env:PG_BIN = 'C:\Program Files\PostgreSQL\17\bin'
npm run test:integration
```

`scripts/test-postgres.mjs` é ferramenta permanente de teste, não script solto de geração. Requer binários locais initdb/pg_ctl/psql e cria um cluster novo em diretório temporário exclusivo, porta livre em loopback, SCRAM e credenciais aleatórias transitórias. Não usa DATABASE_URL externa nem toca no PostgreSQL existente. Cria role não superuser, aplica migrate deploy duas vezes, verifica migrate status e roda Jest de integração real. Finalmente encerra o cluster e remove dados/credenciais após verificar o caminho absoluto. Erros não são convertidos em skip/PASS.

`npm test` roda regressão/unit/HTTP sem banco (14 testes). `npm run test:integration` roda 12 testes obrigatórios de banco/isolamento separadamente. Ambos devem passar para aceitar WP-102. Isso evita usar o banco pessoal por acidente e deixa a pré-condição de integração explícita. Linux exige executar initdb como usuário sem root. Docker não é necessário para esse runner, embora doc 29 sugira Docker como hospedagem do PostgreSQL de testes.

Dependências adicionadas: prisma (dev), @prisma/client e @prisma/adapter-pg 7.10.0. Prisma 8 RC não adotado. Adapter-pg fornece driver pg; não há segundo ORM/logger/config. Overrides corretivos deepmerge-ts 8.0.2 e mysql2 3.24.4 tratam advisories transitivos do CLI. Isso não significa adotar MySQL: datasource continua postgresql. Revisar overrides quando upstream corrigir. Validação de config/migration/client e testes passaram com eles.

[Relatório WP-102 e critérios de aceite](../../docs/architecture/wp-102-persistence-report.md). Docker daemon indisponível: imagem não construída/testada nesta rodada.
