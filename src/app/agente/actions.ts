"use server";

/**
 * Server Actions da Área do Agente (seções 4, 13, 22–24).
 * Toda regra crítica é validada no backend (seção 40). O agente não tem
 * sessão Supabase Auth: usamos o service client no servidor.
 */
import { serviceClient } from "@/lib/supabase/clients";
import {
  loginAgenteSchema,
  novoConcorrenteSchema,
  coletaSchema,
} from "@/lib/validation/schemas";
import { competenciaVigente, formatarCompetenciaCurta } from "@/lib/domain/competencia";
import {
  listarRegionais,
  listarCidades,
  listarEmpreendimentos,
  listarConcorrentes,
} from "@/lib/data/hierarquia";

export interface AgenteSessao { id_agente: string; nome: string; }

type Resultado<T> = { ok: true; data: T } | { ok: false; erro: string };

/**
 * Identificação do agente pelo telefone (seção 4).
 * Nunca cria agente. Bloqueia telefone inexistente ou inativo.
 */
export async function identificarAgente(
  telefoneBruto: string,
): Promise<Resultado<AgenteSessao>> {
  const parsed = loginAgenteSchema.safeParse({ telefone: telefoneBruto });
  if (!parsed.success) {
    return { ok: false, erro: "Telefone inválido." };
  }
  const telefone = parsed.data.telefone; // já normalizado

  const db = serviceClient();
  const { data, error } = await db
    .from("agentes_campo")
    .select("id_agente, nome, ativo")
    .eq("telefone", telefone)
    .maybeSingle();

  if (error) return { ok: false, erro: "Erro ao consultar. Tente novamente." };

  // Mesma mensagem para inexistente e inativo (seção 4).
  if (!data || !data.ativo) {
    return {
      ok: false,
      erro:
        "Telefone não localizado. Verifique o número informado ou entre em contato com o responsável.",
    };
  }
  return { ok: true, data: { id_agente: data.id_agente, nome: data.nome } };
}

// Seletores em cascata expostos como actions para o cliente.
export async function actRegionais() { return listarRegionais(); }
export async function actCidades(regional: string) { return listarCidades(regional); }
export async function actEmpreendimentos(idCidade: number) { return listarEmpreendimentos(idCidade); }
export async function actConcorrentes(idEmp: number) { return listarConcorrentes(idEmp); }

/**
 * Cadastro de novo concorrente durante a coleta (seção 13).
 * ID gerado no backend via RPC transacional com lock (seção 12).
 */
export async function cadastrarConcorrente(input: {
  id_empreendimento: number;
  nome: string;
}): Promise<Resultado<{ id_concorrente: number; concorrente: string }>> {
  const parsed = novoConcorrenteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const db = serviceClient();
  const { data, error } = await db.rpc("inserir_concorrente", {
    p_id_empreendimento: parsed.data.id_empreendimento,
    p_nome: parsed.data.nome,
    p_created_by: null,
  });

  if (error) {
    if (error.code === "23505" || /duplicad/i.test(error.message)) {
      return { ok: false, erro: "Já existe um concorrente com esse nome neste empreendimento." };
    }
    return { ok: false, erro: "Não foi possível cadastrar o concorrente." };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, data: { id_concorrente: row.id_concorrente, concorrente: row.concorrente } };
}

export interface ResumoColeta {
  id_concorrente: number;
  mes_ano: string;
  competencia: string;
  estoque: number;
  vendas: number;
  atualizado: boolean;
}

/**
 * Registro/atualização de coleta (seções 22–24).
 * Competência automática (seção 19). Unicidade concorrente/mês (seção 23):
 * na primeira tentativa não atualiza; se já existir, retorna sinal para o
 * cliente confirmar atualização.
 */
export async function salvarColeta(input: {
  id_agente: string;
  id_concorrente: number;
  estoque: number;
  vendas: number;
  atualizar?: boolean;
}): Promise<
  | { ok: true; data: ResumoColeta }
  | { ok: false; erro: string; jaExiste?: boolean; competencia?: string }
> {
  const parsed = coletaSchema.safeParse({
    id_agente: input.id_agente,
    id_concorrente: input.id_concorrente,
    estoque: input.estoque,
    vendas: input.vendas,
    atualizar: input.atualizar ?? false,
  });
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const db = serviceClient();
  const mes_ano = competenciaVigente();

  // Confere agente ativo (seção 24: agente identificado).
  const { data: agente } = await db
    .from("agentes_campo")
    .select("id_agente, ativo")
    .eq("id_agente", parsed.data.id_agente)
    .maybeSingle();
  if (!agente || !agente.ativo) {
    return { ok: false, erro: "Sessão do agente inválida. Identifique-se novamente." };
  }

  // Coleta existente para o concorrente/mês?
  const { data: existente } = await db
    .from("coletas_mensais")
    .select("id_coleta")
    .eq("id_concorrente", parsed.data.id_concorrente)
    .eq("mes_ano", mes_ano)
    .maybeSingle();

  if (existente && !parsed.data.atualizar) {
    return {
      ok: false,
      jaExiste: true,
      competencia: formatarCompetenciaCurta(mes_ano),
      erro: `Já existe uma coleta para este concorrente em ${formatarCompetenciaCurta(mes_ano)}.`,
    };
  }

  if (existente && parsed.data.atualizar) {
    const { error } = await db
      .from("coletas_mensais")
      .update({
        estoque: parsed.data.estoque,
        vendas: parsed.data.vendas,
        id_agente: parsed.data.id_agente, // registra quem atualizou (seção 23)
      })
      .eq("id_coleta", existente.id_coleta);
    if (error) return { ok: false, erro: "Não foi possível atualizar a coleta." };
    return {
      ok: true,
      data: {
        id_concorrente: parsed.data.id_concorrente,
        mes_ano,
        competencia: formatarCompetenciaCurta(mes_ano),
        estoque: parsed.data.estoque,
        vendas: parsed.data.vendas,
        atualizado: true,
      },
    };
  }

  // Inserção nova.
  const { error } = await db.from("coletas_mensais").insert({
    id_agente: parsed.data.id_agente,
    id_concorrente: parsed.data.id_concorrente,
    mes_ano,
    estoque: parsed.data.estoque,
    vendas: parsed.data.vendas,
  });
  if (error) {
    if (error.code === "23505") {
      // corrida: alguém inseriu no meio tempo
      return {
        ok: false,
        jaExiste: true,
        competencia: formatarCompetenciaCurta(mes_ano),
        erro: `Já existe uma coleta para este concorrente em ${formatarCompetenciaCurta(mes_ano)}.`,
      };
    }
    return { ok: false, erro: "Não foi possível registrar a coleta." };
  }
  return {
    ok: true,
    data: {
      id_concorrente: parsed.data.id_concorrente,
      mes_ano,
      competencia: formatarCompetenciaCurta(mes_ano),
      estoque: parsed.data.estoque,
      vendas: parsed.data.vendas,
      atualizado: false,
    },
  };
}
