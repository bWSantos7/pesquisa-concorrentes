/**
 * Consultas da Área do Gestor (seções 35, 36).
 * Executadas no servidor com o service client após o guard de gestor.
 */
import { serviceClient } from "@/lib/supabase/clients";

export interface LinhaPesquisa {
  id_coleta: string;
  coletado_em: string;
  agente: string;
  regional: string;
  cidade: string;
  empreendimento: string;
  concorrente: string;
  mes_ano: string;
  estoque: number;
  vendas: number;
}

export interface FiltroPesquisas {
  mesAno?: string;
  regional?: string;
  idCidade?: number;
  idEmpreendimento?: number;
  idConcorrente?: number;
  idAgente?: string;
  limite?: number;
  offset?: number;
}

export async function listarPesquisas(f: FiltroPesquisas): Promise<LinhaPesquisa[]> {
  const db = serviceClient();
  let q = db
    .from("coletas_mensais")
    .select(
      `id_coleta, coletado_em, mes_ano, estoque, vendas,
       agentes_campo!inner(nome),
       concorrentes!inner(
         concorrente, id_empreendimento,
         empreendimentos!inner(
           empreendimento, id_cidade,
           cidades!inner(cidade, regional)
         )
       )`,
    )
    .order("coletado_em", { ascending: false });

  if (f.mesAno) q = q.eq("mes_ano", f.mesAno);
  if (f.idConcorrente) q = q.eq("id_concorrente", f.idConcorrente);
  if (f.idAgente) q = q.eq("id_agente", f.idAgente);
  if (f.idEmpreendimento) q = q.eq("concorrentes.id_empreendimento", f.idEmpreendimento);
  if (f.regional) q = q.eq("concorrentes.empreendimentos.cidades.regional", f.regional);
  if (f.idCidade) q = q.eq("concorrentes.empreendimentos.id_cidade", f.idCidade);

  const limite = f.limite ?? 50;
  const offset = f.offset ?? 0;
  q = q.range(offset, offset + limite - 1);

  const { data, error } = await q;
  if (error) throw error;

  type LinhaRaw = {
    id_coleta: string;
    coletado_em: string;
    mes_ano: string;
    estoque: number;
    vendas: number;
    agentes_campo: { nome: string };
    concorrentes: {
      concorrente: string;
      empreendimentos: {
        empreendimento: string;
        cidades: { cidade: string; regional: string };
      };
    };
  };

  return ((data ?? []) as unknown as LinhaRaw[]).map((r) => {
    const conc = r.concorrentes;
    const emp = conc.empreendimentos;
    const cid = emp.cidades;
    return {
      id_coleta: r.id_coleta,
      coletado_em: r.coletado_em,
      agente: r.agentes_campo.nome,
      regional: cid.regional,
      cidade: cid.cidade,
      empreendimento: emp.empreendimento,
      concorrente: conc.concorrente,
      mes_ano: r.mes_ano,
      estoque: r.estoque,
      vendas: r.vendas,
    };
  });
}

export interface LinhaAgente {
  id_agente: string;
  nome: string;
  telefone: string;
  ativo: boolean;
  created_at: string;
  ultima_coleta: string | null;
}

export async function listarAgentes(): Promise<LinhaAgente[]> {
  const db = serviceClient();
  const { data, error } = await db
    .from("agentes_campo")
    .select("id_agente, nome, telefone, ativo, created_at, coletas_mensais(coletado_em)")
    .order("nome");
  if (error) throw error;

  type AgenteRaw = {
    id_agente: string;
    nome: string;
    telefone: string;
    ativo: boolean;
    created_at: string;
    coletas_mensais: { coletado_em: string }[] | null;
  };

  return ((data ?? []) as unknown as AgenteRaw[]).map((a) => {
    const datas: string[] = (a.coletas_mensais ?? []).map((c) => c.coletado_em);
    const ultima = datas.length ? datas.sort().at(-1)! : null;
    return {
      id_agente: a.id_agente,
      nome: a.nome,
      telefone: a.telefone,
      ativo: a.ativo,
      created_at: a.created_at,
      ultima_coleta: ultima,
    };
  });
}

export interface DadoProprio {
  id_empreendimento: number;
  mes_ano: string;
  estoque: number;
  vendas: number;
  atualizado_em: string | null;
}

/** Lê os dados próprios de um empreendimento numa competência (seção 25). */
export async function obterDadosProprios(
  idEmpreendimento: number,
  mesAno: string,
): Promise<DadoProprio | null> {
  const db = serviceClient();
  const { data, error } = await db
    .from("dados_proprios_mensais")
    .select("id_empreendimento, mes_ano, estoque, vendas, atualizado_em")
    .eq("id_empreendimento", idEmpreendimento)
    .eq("mes_ano", mesAno)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Opções de agente para filtros (id + nome), ordenadas por nome. */
export async function listarAgentesOpcoes(): Promise<{ id_agente: string; nome: string }[]> {
  const db = serviceClient();
  const { data, error } = await db
    .from("agentes_campo")
    .select("id_agente, nome")
    .order("nome");
  if (error) throw error;
  return data ?? [];
}
