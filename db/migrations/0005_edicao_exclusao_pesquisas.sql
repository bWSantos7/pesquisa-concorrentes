-- =====================================================================
-- 0005_edicao_exclusao_pesquisas.sql
-- Edição e exclusão de dados de pesquisa pelo Gestor — extensão pedida
-- pelo usuário (a especificação não previa corrigir/apagar coletas de
-- concorrentes nem dados próprios já registrados).
--
-- A exclusão é FÍSICA (o registro sai da tabela de origem), mas antes é
-- copiado para `exclusoes_auditoria` com quem apagou e quando, para
-- rastreabilidade (mesmo espírito da auditoria da seção 44).
--
-- Também adiciona `atualizado_por` em coletas_mensais, para registrar o
-- gestor que corrigiu uma coleta (dados_proprios_mensais já tem essa
-- coluna).
-- =====================================================================

alter table coletas_mensais
  add column if not exists atualizado_por uuid references gestores (id_gestor);

create table if not exists exclusoes_auditoria (
  id_exclusao  uuid primary key default gen_random_uuid(),
  entidade     text not null check (entidade in ('coleta_mensal', 'dados_proprios_mensal')),
  -- id do registro original (uuid como texto — serve para as duas tabelas).
  id_registro  text not null,
  -- snapshot completo da linha apagada, para eventual reconstrução manual.
  dados        jsonb not null,
  excluido_por uuid references gestores (id_gestor),
  excluido_em  timestamptz not null default now()
);
create index if not exists idx_exclusoes_entidade
  on exclusoes_auditoria (entidade, excluido_em desc);
