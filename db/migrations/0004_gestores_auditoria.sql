-- =====================================================================
-- 0004_gestores_auditoria.sql
-- Cadastro de gestores por outros gestores — extensão pedida pelo
-- usuário, fora do escopo original da especificação (a seção 2 não
-- previa essa funcionalidade). Adiciona auditoria (created_by/
-- updated_by) em gestores, mesmo padrão já usado em concorrentes e
-- agentes_campo (seção 44).
-- =====================================================================

alter table gestores
  add column if not exists created_by uuid references gestores (id_gestor),
  add column if not exists updated_by uuid references gestores (id_gestor);
