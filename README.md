# App de Pesquisa de Concorrentes Imobiliários

Aplicação de pesquisa mensal de mercado: agentes de campo registram estoque e
vendas de empreendimentos concorrentes, e gestores acompanham os resultados por
dashboards. Construída a partir da especificação do projeto e da planilha
normalizada `Comparativo_Normalizado_App_v2.xlsx`.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · PostgreSQL/Supabase ·
Supabase Auth (gestores) · Zod (validação) · Vitest (testes). Regras de negócio
e cálculos ficam na camada de domínio (`src/lib/domain`), isolados de UI e acesso
a dados. O projeto usa Next.js **14.2.35** (último patch de segurança da linha
14.2.x); o `postcss` é fixado em ≥ 8.5.26 via `overrides`. Um `npm audit` ainda
aponta advisories de ferramentas de desenvolvimento (Vitest/Vite/ESLint) cuja
correção exigiria major bumps — sem impacto no runtime de produção.

## Duas áreas

- **Agente de campo** (`/agente`): acesso somente pelo telefone cadastrado e
  ativo — sem senha, sem autocadastro. Fluxo mobile-first: Regional → Cidade →
  Empreendimento → Concorrente → Estoque → Vendas. Competência (mês/ano)
  automática em `America/Sao_Paulo`.
- **Gestor** (`/gestor`): autenticado via Supabase Auth. Dashboard, pesquisas,
  gestão de agentes, cadastro de concorrentes e dados próprios do empreendimento.

## Estrutura

```
supabase/migrations/   0001 schema · 0002 geração de ID · 0003 RLS · 0004 seed
src/lib/domain/        telefone, competência, cálculos do dashboard (com testes)
src/lib/data/          acesso a dados (hierarquia, dashboard, gestor)
src/lib/supabase/      clientes (anon, servidor, service role) e guard de gestor
src/lib/validation/    schemas Zod
src/app/agente/        fluxo do agente (UI + server actions)
src/app/gestor/        área administrativa (login + painel guardado)
scripts/               seed de gestor e agentes
tests/                 testes das fórmulas e do domínio
```

## Instalação

Requisitos: Node.js 18+ e um projeto Supabase.

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do seu projeto
```

Variáveis (ver `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — públicas.
- `SUPABASE_SERVICE_ROLE_KEY` — **secreta**, somente servidor. Usada no fluxo do
  agente (que não tem sessão Auth) e nos seeds. Nunca exposta ao navegador.

## Banco de dados (migrations + seed de dados)

Aplique os arquivos de `supabase/migrations/` em ordem, via SQL Editor do
Supabase ou CLI:

```bash
# via Supabase CLI (projeto linkado)
supabase db push
# ou cole cada arquivo, em ordem, no SQL Editor:
# 0001_schema.sql → 0002_id_concorrente.sql → 0003_rls.sql → 0004_seed.sql
```

`0004_seed.sql` carrega os cadastros mestres da planilha: 4 regionais, 12
cidades, 18 empreendimentos e 35 concorrentes.

## Seed de acesso (gestor + agentes)

Cria o primeiro gestor (Supabase Auth + tabela `gestores`) e agentes de exemplo:

```bash
GESTOR_EMAIL="voce@empresa.com" GESTOR_SENHA="uma-senha-forte" \
GESTOR_NOME="Seu Nome" npm run seed:agentes
```

Depois, entre em `/gestor/login` com essas credenciais. Cadastre os agentes reais
pela tela **Agentes** (o telefone é normalizado para somente dígitos e precisa ser
único).

## Executar

```bash
npm run dev        # desenvolvimento
npm run build      # build de produção
npm run start      # servir o build
```

## Deploy no Railway

O Railway hospeda apenas a aplicação Next.js — o banco de dados, Auth e RLS
continuam no Supabase (serviço externo gerenciado). Não é necessário
provisionar Postgres no Railway.

1. **Antes do primeiro deploy**, aplique as migrations no Supabase (seção
   "Banco de dados" acima) e rode `npm run seed:agentes` localmente para criar
   o primeiro gestor — isso não faz parte do processo de build do Railway.
2. Conecte o repositório no Railway (New Project → Deploy from GitHub repo).
   O builder é detectado automaticamente (Railpack); `railway.json` já define
   `build`, `start` e o healthcheck (`/api/health`).
3. Cadastre em **Service → Variables**, antes do primeiro build:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (marque como *sealed*)

   As duas primeiras são embutidas no bundle do navegador durante `next
   build`, então precisam existir **antes** do build — o Railway já injeta as
   variáveis do serviço tanto no build quanto no runtime, então basta
   cadastrá-las antes de disparar o primeiro deploy.
4. O Railway define `PORT` automaticamente; o `next start` já lê essa
   variável nativamente (e escuta em `0.0.0.0` por padrão). Não defina `PORT`
   manualmente.
5. Gere o domínio público em Service → Settings → Networking, ou rode
   `railway domain`.

Nenhum outro passo manual é necessário após o deploy.

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
- RLS por perfil; agente opera via service role no servidor, sem credenciais no
  navegador.
- Telefone normalizado e único; senhas apenas no provedor de Auth.
- Geração do ID de concorrente no backend, com lock contra condição de corrida.
