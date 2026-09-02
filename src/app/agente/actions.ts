"use server";

/**
 * Server Actions da Área do Agente (seções 4, 13, 22–24).
 * Toda regra crítica é validada no backend (seção 40). O agente não tem
 * login/sessão: o telefone é conferido a cada ação direto no banco.
 */
import { db } from "@/lib/db/pool";
import {
  loginAgenteSchema,
  novoConcorrenteSchema,
  coletaSchema,
} from "@/lib/validation/schemas";
import {
  competenciaVigente,
  competenciaValida,
  formatarCompetenciaCurta,
} from "@/lib/domain/competencia";
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

  const { rows } = await db().query<{ id_agente: string; nome: string; ativo: boolean }>(
    `select id_agente, nome, ativo from agentes_campo where telefone = $1`,
    [telefone],
  );
  const agente = rows[0];

  // Mesma mensagem para inexistente e inativo (seção 4).
  if (!agente || !agente.ativo) {
    return {
      ok: false,
      erro:
        "Telefone não localizado. Verifique o número informado ou entre em contato com o responsável.",
    };
  }
  return { ok: true, data: { id_agente: agente.id_agente, nome: agente.nome } };
}

// Seletores em cascata expostos como actions para o cliente.
export async function actRegionais() { return listarRegionais(); }
export async function actCidades(regional: string) { return listarCidades(regional); }
export async function actEmpreendimentos(idCidade: number) { return listarEmpreendimentos(idCidade); }
export async function actConcorrentes(idEmp: number) { return listarConcorrentes(idEmp); }

/**
 * Cadastro de novo concorrente durante a coleta (seção 13).
 * ID gerado no backend via função SQL transacional com lock (seção 12).
 */
export async function cadastrarConcorrente(input: {
  id_empreendimento: number;
  nome: string;
}): Promise<Resultado<{ id_concorrente: number; concorrente: string }>> {
  const parsed = novoConcorrenteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const { rows } = await db().query<{ id_concorrente: number; concorrente: string }>(
      `select id_concorrente, concorrente from inserir_concorrente($1, $2, $3)`,
      [parsed.data.id_empreendimento, parsed.data.nome, null],
    );
    const row = rows[0];
    return { ok: true, data: { id_concorrente: row.id_concorrente, concorrente: row.concorrente } };
  } catch (e) {
    const erro = e as { code?: string; message?: string };
    if (erro.code === "23505" || /duplicad/i.test(erro.message ?? "")) {
      return { ok: false, erro: "Já existe um concorrente com esse nome neste empreendimento." };
    }
    return { ok: false, erro: "Não foi possível cadastrar o concorrente." };
  }
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
  mes_ano?: string;
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
    mes_ano: input.mes_ano,
    atualizar: input.atualizar ?? false,
  });
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const pool = db();
  // Competência escolhida pelo agente; se não vier (ou vier inválida), usa a vigente.
  const mes_ano =
    parsed.data.mes_ano && competenciaValida(parsed.data.mes_ano)
      ? parsed.data.mes_ano
      : competenciaVigente();

  // Confere agente ativo (seção 24: agente identificado).
  const { rows: agenteRows } = await pool.query<{ ativo: boolean }>(
    `select ativo from agentes_campo where id_agente = $1`,
    [parsed.data.id_agente],
  );
  const agente = agenteRows[0];
  if (!agente || !agente.ativo) {
    return { ok: false, erro: "Sessão do agente inválida. Identifique-se novamente." };
  }

  // Coleta existente para o concorrente/mês?
  const { rows: existenteRows } = await pool.query<{ id_coleta: string }>(
    `select id_coleta from coletas_mensais where id_concorrente = $1 and mes_ano = $2`,
    [parsed.data.id_concorrente, mes_ano],
  );
  const existente = existenteRows[0];

  if (existente && !parsed.data.atualizar) {
    return {
      ok: false,
      jaExiste: true,
      competencia: formatarCompetenciaCurta(mes_ano),
      erro: `Já existe uma coleta para este concorrente em ${formatarCompetenciaCurta(mes_ano)}.`,
    };
  }

  if (existente && parsed.data.atualizar) {
    try {
      await pool.query(
        `update coletas_mensais set estoque = $1, vendas = $2, id_agente = $3 where id_coleta = $4`,
        [parsed.data.estoque, parsed.data.vendas, parsed.data.id_agente, existente.id_coleta],
      );
    } catch {
      return { ok: false, erro: "Não foi possível atualizar a coleta." };
    }
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
  try {
    await pool.query(
      `insert into coletas_mensais (id_agente, id_concorrente, mes_ano, estoque, vendas)
       values ($1, $2, $3, $4, $5)`,
      [parsed.data.id_agente, parsed.data.id_concorrente, mes_ano, parsed.data.estoque, parsed.data.vendas],
    );
  } catch (e) {
    const erro = e as { code?: string };
    if (erro.code === "23505") {
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
