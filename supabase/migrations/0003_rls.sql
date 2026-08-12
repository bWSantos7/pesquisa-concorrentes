-- =====================================================================
-- 0003_rls.sql
-- Row Level Security (seção 40 — autorização por perfil).
--
-- Modelo de acesso:
--   * GESTOR: usuário autenticado via Supabase Auth cujo id existe em
--     `gestores` com ativo=true. Pode LER tudo e administrar cadastros.
--   * AGENTE: NÃO possui sessão Supabase Auth. Todo o fluxo do agente roda
--     no servidor (Server Actions) usando a Service Role Key, que ignora RLS.
--     Assim o navegador do agente nunca recebe credenciais nem acessa dados
--     de outros agentes — a autorização é feita na camada de domínio/servidor.
--
-- Portanto as policies abaixo liberam leitura para gestores ativos e negam
-- o resto ao papel `anon`/`authenticated` comum. O acesso do agente é
-- mediado pelo backend com service role.
-- =====================================================================

alter table regionais              enable row level security;
alter table cidades                enable row level security;
alter table empreendimentos        enable row level security;
alter table concorrentes           enable row level security;
alter table gestores               enable row level security;
alter table agentes_campo          enable row level security;
alter table coletas_mensais        enable row level security;
alter table dados_proprios_mensais enable row level security;

-- Helper: o usuário atual é um gestor ativo?
create or replace function is_gestor_ativo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from gestores
    where id_gestor = auth.uid() and ativo = true
  );
$$;

-- Leitura para gestores ativos em todas as tabelas de referência e dados.
do $$
declare t text;
begin
  foreach t in array array[
    'regionais','cidades','empreendimentos','concorrentes',
    'agentes_campo','coletas_mensais','dados_proprios_mensais','gestores'
  ]
  loop
    execute format(
      'drop policy if exists p_select_gestor on %I;', t);
    execute format(
      'create policy p_select_gestor on %I for select using (is_gestor_ativo());', t);
  end loop;
end $$;

-- Escrita administrativa: gestores ativos podem inserir/atualizar cadastros.
-- (Exclusão física de agentes é proibida pela regra de negócio — usar ativo.)
do $$
declare t text;
begin
  foreach t in array array[
    'regionais','cidades','empreendimentos','concorrentes',
    'agentes_campo','dados_proprios_mensais'
  ]
  loop
    execute format('drop policy if exists p_ins_gestor on %I;', t);
    execute format('drop policy if exists p_upd_gestor on %I;', t);
    execute format(
      'create policy p_ins_gestor on %I for insert with check (is_gestor_ativo());', t);
    execute format(
      'create policy p_upd_gestor on %I for update using (is_gestor_ativo()) with check (is_gestor_ativo());', t);
  end loop;
end $$;

-- Gestor pode ler/gerir o próprio registro em `gestores`.
drop policy if exists p_upd_gestor_self on gestores;
create policy p_upd_gestor_self on gestores for update
  using (id_gestor = auth.uid()) with check (id_gestor = auth.uid());

-- Observação: a Service Role Key (usada apenas no servidor para o fluxo do
-- agente e seeds) ignora RLS por padrão no Supabase. Nunca expor no frontend.
