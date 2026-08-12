-- =====================================================================
-- 0002_id_concorrente.sql
-- Geração automática do ID do Concorrente (seção 12).
--
-- Regra: o ID começa pelo ID do empreendimento pai.
--   Empreendimento 60 -> 601, 602, 603...
--   Empreendimento 66 -> 661, 662, 663...
--
-- O usuário NÃO informa o ID. Gerado no backend, com proteção contra
-- condição de corrida (advisory lock por empreendimento) e revalidação
-- antes da inserção.
--
-- Sequência: concatenação prefixo + sequencial (601, 602, ...).
-- Para prefixo P, a "janela" de IDs é [P*10 .. P*10+8] no caso comum de
-- até 9 concorrentes. Quando passa de 9, continua incrementando o número
-- inteiro (ex.: 60 -> 6010, 6011...), mantendo o prefixo textual.
-- Isso preserva a regra "começa pelo ID do pai" e evita colisão.
-- =====================================================================

create or replace function proximo_id_concorrente(p_id_empreendimento integer)
returns integer
language plpgsql
as $$
declare
  v_prefixo    text := p_id_empreendimento::text;
  v_max_seq    integer;
  v_novo_id    integer;
begin
  -- Lock por empreendimento: serializa geração concorrente sem travar a tabela.
  perform pg_advisory_xact_lock(p_id_empreendimento);

  -- Confere se o empreendimento existe.
  if not exists (select 1 from empreendimentos where id_empreendimento = p_id_empreendimento) then
    raise exception 'Empreendimento % inexistente', p_id_empreendimento;
  end if;

  -- Maior ID já usado cujo texto começa pelo prefixo do empreendimento.
  select max(id_concorrente)
    into v_max_seq
    from concorrentes
   where id_concorrente::text like v_prefixo || '%';

  if v_max_seq is null then
    -- Primeiro concorrente do empreendimento: prefixo + '1'  (ex.: 60 -> 601)
    v_novo_id := (v_prefixo || '1')::integer;
  else
    v_novo_id := v_max_seq + 1;
    -- Se o incremento "vazou" o prefixo (ex.: 609 -> 610, onde 61 já é outro
    -- empreendimento), abre uma nova ordem de grandeza mantendo o prefixo
    -- textual: prefixo + '0' * (n_digitos_extras) + '1'.
    -- Ex.: 609 -> passa a 6001? Não: preservamos a contagem crescendo,
    -- então prefixo '60' com 10 concorrentes vira 6010, 6011, ...
    if left(v_novo_id::text, length(v_prefixo)) <> v_prefixo then
      v_novo_id := (v_prefixo || '01')::integer;  -- inicia nova faixa: 60 -> 6001
    end if;
  end if;

  -- Revalidação final anti-colisão: garante prefixo e unicidade.
  while exists (select 1 from concorrentes where id_concorrente = v_novo_id)
        or left(v_novo_id::text, length(v_prefixo)) <> v_prefixo loop
    v_novo_id := v_novo_id + 1;
  end loop;

  return v_novo_id;
end;
$$;

-- Inserção transacional de concorrente com ID gerado + checagem de nome
-- duplicado (case-insensitive, trim) dentro do empreendimento.
create or replace function inserir_concorrente(
  p_id_empreendimento integer,
  p_nome              text,
  p_created_by        uuid default null
)
returns concorrentes
language plpgsql
as $$
declare
  v_id   integer;
  v_row  concorrentes;
  v_nome text := btrim(p_nome);
begin
  if v_nome is null or length(v_nome) = 0 then
    raise exception 'Nome do concorrente é obrigatório';
  end if;

  -- Trava por empreendimento também protege a checagem de duplicidade.
  perform pg_advisory_xact_lock(p_id_empreendimento);

  if exists (
    select 1 from concorrentes
     where id_empreendimento = p_id_empreendimento
       and lower(btrim(concorrente)) = lower(v_nome)
  ) then
    raise exception 'Concorrente duplicado neste empreendimento: %', v_nome
      using errcode = 'unique_violation';
  end if;

  v_id := proximo_id_concorrente(p_id_empreendimento);

  insert into concorrentes (id_concorrente, id_empreendimento, concorrente, ativo, created_by, updated_by)
  values (v_id, p_id_empreendimento, v_nome, true, p_created_by, p_created_by)
  returning * into v_row;

  return v_row;
end;
$$;
