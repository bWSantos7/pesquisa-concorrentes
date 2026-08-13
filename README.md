# App de Pesquisa de Concorrentes Imobiliários

Aplicação de pesquisa mensal de mercado: agentes de campo registram estoque e
vendas de empreendimentos concorrentes, e gestores acompanham os resultados por
dashboards. Construída a partir da especificação do projeto e da planilha
normalizada `Comparativo_Normalizado_App_v2.xlsx`.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · PostgreSQL (driver `pg`,
SQL direto — sem ORM) · Autenticação própria do Gestor (bcrypt + sessão JWT em
cookie httpOnly, via `jose`) · Zod (validação) · Vitest (testes). Regras de
negócio e cálculos ficam na camada de domínio (`src/lib/domain`), isolados de
UI e acesso a dados. Não há dependência de nenhum serviço externo de
Auth/BaaS — o único serviço externo é o próprio PostgreSQL.

O projeto usa Next.js **14.2.35** (último patch da linha 14.2.x); o `postcss`
é fixado em ≥ 8.5.26 via `overrides`. **Atenção:** `npm audit` aponta várias
advisories de severidade alta no próprio `next`, cuja correção completa exige
subir para a major 15 ou 16 (mudança de API — ex.: `cookies()`/`headers()`
passam a ser assíncronos —, não feita aqui por estar fora do escopo desta
preparação para deploy). Avalie esse upgrade antes de ir para produção com
dados reais.

## Duas áreas

- **Agente de campo** (`/agente`): acesso somente pelo telefone cadastrado e
  ativo — sem senha, sem autocadastro. Fluxo mobile-first: Regional → Cidade →
  Empreendimento → Concorrente → Estoque → Vendas. Competência (mês/ano)
  automática em `America/Sao_Paulo`.
- **Gestor** (`/gestor`): login por e-mail/senha (hash bcrypt, sessão em
  cookie httpOnly assinado). Dashboard, pesquisas, gestão de agentes,
  cadastro de concorrentes e dados próprios do empreendimento.

## Estrutura

```
db/migrations/          0001 schema · 0002 geração de ID · 0003 seed
src/lib/domain/          telefone, competência, cálculos do dashboard (com testes)
src/lib/data/             acesso a dados (hierarquia, dashboard, gestor) — SQL direto
src/lib/db/                pool de conexão PostgreSQL
src/lib/auth/              sessão do gestor (JWT), hash de senha (bcrypt), guard
src/lib/validation/     schemas Zod
src/app/agente/           fluxo do agente (UI + server actions)
src/app/gestor/            área administrativa (login + painel guardado)
src/app/api/health/     healthcheck (Railway)
scripts/                    migrate.mjs (migrations + bootstrap do gestor) e seed de agentes de exemplo
tests/                        testes das fórmulas e do domínio
```

## Instalação

Requisitos: Node.js 18+ e um PostgreSQL (local, Docker ou o Postgres do
Railway).

```bash
npm install
cp .env.example .env.local   # preencha DATABASE_URL, SESSION_SECRET etc.
```

Variáveis (ver `.env.example` para a lista completa e comentada):

- `DATABASE_URL` — connection string do Postgres.
- `SESSION_SECRET` — **secreta**, assina a sessão do Gestor.
- `GESTOR_EMAIL` / `GESTOR_SENHA` / `GESTOR_NOME` — usadas uma única vez pelo
  script de migração para criar o primeiro gestor.

## Banco de dados (migrations + bootstrap do primeiro gestor)

Não há passo manual: `npm run migrate` (ou `npm start`, que já roda a
migração antes de subir o servidor) aplica os arquivos de `db/migrations/`
em ordem — de forma idempotente, controlada por uma tabela `_migrations` — e,
se `GESTOR_EMAIL`/`GESTOR_SENHA` estiverem definidas e ainda não existir um
gestor com esse e-mail, cria o primeiro login.

```bash
DATABASE_URL="postgres://..." GESTOR_EMAIL="voce@empresa.com" \
GESTOR_SENHA="uma-senha-forte" GESTOR_NOME="Seu Nome" npm run migrate
```

`0003_seed.sql` carrega os cadastros mestres da planilha: 4 regionais, 12
cidades, 18 empreendimentos e 35 concorrentes.

Depois, entre em `/gestor/login` com as credenciais definidas. Cadastre os
agentes de campo reais pela tela **Agentes** (o telefone é normalizado para
somente dígitos e precisa ser único) — ou use `npm run seed:agentes` para
alguns agentes de exemplo em ambiente local.

## Executar

```bash
npm run dev        # desenvolvimento
npm run build      # build de produção
npm run start      # roda a migração e serve o build
```

## Deploy no Railway

1. Adicione um serviço **PostgreSQL** ao projeto Railway e conecte o
   repositório (New Project → Deploy from GitHub repo). O builder é
   detectado automaticamente (Railpack); `railway.json` já define `build`,
   `start` e o healthcheck (`/api/health`).
2. Cadastre em **Service → Variables**, antes do primeiro deploy:
   - `DATABASE_URL` → referencie o Postgres do projeto: `${{Postgres.DATABASE_URL}}`
   - `SESSION_SECRET` (marque como *sealed*) — gere com
     `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
   - `GESTOR_EMAIL`, `GESTOR_SENHA` (sealed), `GESTOR_NOME` — bootstrap do
     primeiro login
3. Dispare o deploy. O `start` do serviço já roda `node scripts/migrate.mjs`
   antes do `next start`: schema, seed de dados mestres e o primeiro gestor
   sobem juntos, sem SQL Editor nem shell manual.
4. O Railway define `PORT` automaticamente; o `next start` já lê essa
   variável nativamente (e escuta em `0.0.0.0` por padrão). Não defina `PORT`
   manualmente.
5. Gere o domínio público em Service → Settings → Networking, ou rode
   `railway domain`.

Nenhum outro passo manual é necessário após o deploy — em redeploys
seguintes, o `migrate.mjs` roda de novo e só aplica o que ainda não foi
aplicado (é seguro rodar em todo boot).

## Qualidade

```bash
npm run test       # testes das fórmulas e do domínio
npm run typecheck  # TypeScript sem emissão
npm run lint       # ESLint (next)
```

Os testes cobrem os exemplos canônicos da especificação: Oferta = 733,
Vendas totais = 70, VSO individual (11/100 = 11,00%, 15/122 ≈ 12,30% …) e o
ranking de VSO (C→1º, D→2º, próprio→3º, E→4º, B→5º).

## Métricas do dashboard

Implementadas: Oferta/estoque total, estoque e vendas individuais, vendas totais,
representatividade (estoque do item / estoque total), VSO individual
(vendas / estoque, com tratamento de divisão por zero) e ranking de VSO
(decrescente, empates na mesma posição).

**Não implementadas por decisão de especificação:** o "VSO consolidado" de 15,71%
e o indicador de 1,50% não têm regra confirmada e ficam pendentes de definição —
não devem ser codificados até que a regra seja esclarecida.

## Segurança

- Validação no backend com Zod; nunca confiar apenas no frontend.
- Sem RLS: a única credencial de banco (`DATABASE_URL`) nunca chega ao
  navegador — toda a autorização por perfil é feita na camada de aplicação
  (Server Actions), tanto para o Gestor (`gestorAtual()`) quanto para o
  Agente (telefone conferido a cada ação).
- Senha do Gestor com hash bcrypt (custo 12); sessão em cookie httpOnly,
  `secure` em produção, assinada (JWT/HS256) com `SESSION_SECRET`.
  Desativar um gestor (`ativo=false`) revoga o acesso imediatamente, mesmo
  com o token ainda válido, porque `gestorAtual()` relê o status no banco a
  cada requisição.
- Telefone normalizado e único.
- Geração do ID de concorrente no backend, com lock contra condição de corrida.
