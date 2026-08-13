"use server";

/**
 * Server Actions da Área do Gestor (seções 3, 36, 25).
 * Autenticação própria (bcrypt + sessão JWT em cookie httpOnly — ver
 * src/lib/auth); administração via SQL direto após confirmar que o
 * solicitante é gestor ativo.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/pool";
import { gestorAtual } from "@/lib/auth/gestor";
import { COOKIE_SESSAO, SESSAO_MAX_AGE_SEGUNDOS, criarSessao } from "@/lib/auth/session";
import { verificarSenha } from "@/lib/auth/senha";
import {
  agenteSchema,
  dadosPropriosSchema,
  novoConcorrenteSchema,
  concorrenteEdicaoSchema,
  empreendimentoSchema,
  empreendimentoEdicaoSchema,
} from "@/lib/validation/schemas";

type R<T = void> = { ok: true; data?: T } | { ok: false; erro: string };

export async function loginGestor(email: string, senha: string): Promise<R> {
  const emailNormalizado = email.trim().toLowerCase();
  const { rows } = await db().query<{ id_gestor: string; senha_hash: string; ativo: boolean }>(
    `select id_gestor, senha_hash, ativo from gestores where lower(email) = $1`,
    [emailNormalizado],
  );
  const gestor = rows[0];
  // Mesma mensagem para e-mail inexistente, senha errada e conta inativa —
  // evita confirmar a existência de uma conta a quem tenta adivinhar.
  if (!gestor || !gestor.ativo) return { ok: false, erro: "E-mail ou senha inválidos." };

  const senhaOk = await verificarSenha(senha, gestor.senha_hash);
  if (!senhaOk) return { ok: false, erro: "E-mail ou senha inválidos." };

  const token = await criarSessao(gestor.id_gestor);
  cookies().set(COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSAO_MAX_AGE_SEGUNDOS,
  });
  return { ok: true };
}

export async function logoutGestor() {
  cookies().set(COOKIE_SESSAO, "", { httpOnly: true, path: "/", maxAge: 0 });
  redirect("/gestor/login");
}

async function exigirGestor() {
  const g = await gestorAtual();
  if (!g) throw new Error("Não autorizado");
  return g;
}

export async function criarAgente(input: {
  nome: string; telefone: string; ativo: boolean;
}): Promise<R> {
  const g = await exigirGestor();
  const parsed = agenteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0].message };

  const pool = db();
  // Verifica duplicidade de telefone normalizado (seção 36).
  const { rows: existe } = await pool.query<{ id_agente: string }>(
    `select id_agente from agentes_campo where telefone = $1`,
    [parsed.data.telefone],
  );
  if (existe[0]) return { ok: false, erro: "Já existe um agente com este telefone." };

  try {
    await pool.query(
      `insert into agentes_campo (nome, telefone, ativo, created_by, updated_by)
       values ($1, $2, $3, $4, $4)`,
      [parsed.data.nome, parsed.data.telefone, parsed.data.ativo, g.id_gestor],
    );
  } catch {
    return { ok: false, erro: "Não foi possível cadastrar o agente." };
  }
  return { ok: true };
}

export async function editarAgente(id: string, input: {
  nome: string; telefone: string; ativo: boolean;
}): Promise<R> {
  const g = await exigirGestor();
  const parsed = agenteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0].message };

  const pool = db();
  const { rows: outro } = await pool.query<{ id_agente: string }>(
    `select id_agente from agentes_campo where telefone = $1 and id_agente <> $2`,
    [parsed.data.telefone, id],
  );
  if (outro[0]) return { ok: false, erro: "Telefone já usado por outro agente." };

  try {
    await pool.query(
      `update agentes_campo set nome = $1, telefone = $2, ativo = $3, updated_by = $4 where id_agente = $5`,
      [parsed.data.nome, parsed.data.telefone, parsed.data.ativo, g.id_gestor, id],
    );
  } catch {
    return { ok: false, erro: "Não foi possível salvar as alterações." };
  }
  return { ok: true };
}

/** Ativa/inativa (nunca exclui fisicamente — seção 6). */
export async function definirStatusAgente(id: string, ativo: boolean): Promise<R> {
  const g = await exigirGestor();
  try {
    await db().query(
      `update agentes_campo set ativo = $1, updated_by = $2 where id_agente = $3`,
      [ativo, g.id_gestor, id],
    );
  } catch {
    return { ok: false, erro: "Não foi possível alterar o status." };
  }
  return { ok: true };
}

/**
 * Cadastro de concorrente pelo Gestor (seção 2: "cadastrar concorrentes").
 * Mesma função de backend do fluxo do Agente (seção 13) — geração de ID
 * com lock e checagem de duplicidade centralizadas em SQL — só muda quem
 * assina como created_by.
 */
export async function criarConcorrenteGestor(input: {
  id_empreendimento: number; nome: string;
}): Promise<R<{ id_concorrente: number }>> {
  const g = await exigirGestor();
  const parsed = novoConcorrenteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    const { rows } = await db().query<{ id_concorrente: number }>(
      `select id_concorrente from inserir_concorrente($1, $2, $3)`,
      [parsed.data.id_empreendimento, parsed.data.nome, g.id_gestor],
    );
    return { ok: true, data: { id_concorrente: rows[0].id_concorrente } };
  } catch (e) {
    const erro = e as { code?: string; message?: string };
    if (erro.code === "23505" || /duplicad/i.test(erro.message ?? "")) {
      return { ok: false, erro: "Já existe um concorrente com esse nome neste empreendimento." };
    }
    return { ok: false, erro: "Não foi possível cadastrar o concorrente." };
  }
}

/**
 * Edição de concorrente pelo Gestor (seção 2: "editar cadastros
 * permitidos"). O empreendimento pai não é editável — ver schemas.ts.
 */
export async function editarConcorrente(
  id: number,
  input: { concorrente: string; ativo: boolean },
): Promise<R> {
  const g = await exigirGestor();
  const parsed = concorrenteEdicaoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0].message };

  try {
    await db().query(
      `update concorrentes set concorrente = $1, ativo = $2, updated_by = $3 where id_concorrente = $4`,
      [parsed.data.concorrente, parsed.data.ativo, g.id_gestor, id],
    );
  } catch (e) {
    const erro = e as { code?: string };
    if (erro.code === "23505") {
      return { ok: false, erro: "Já existe um concorrente com esse nome neste empreendimento." };
    }
    return { ok: false, erro: "Não foi possível salvar as alterações." };
  }
  return { ok: true };
}

/** Ativa/inativa concorrente (nunca exclui fisicamente — mesma regra dos agentes). */
export async function definirStatusConcorrente(id: number, ativo: boolean): Promise<R> {
  const g = await exigirGestor();
  try {
    await db().query(
      `update concorrentes set ativo = $1, updated_by = $2 where id_concorrente = $3`,
      [ativo, g.id_gestor, id],
    );
  } catch {
    return { ok: false, erro: "Não foi possível alterar o status." };
  }
  return { ok: true };
}

/**
 * Cadastro de empreendimento pelo Gestor (seção 10). Diferente do
 * concorrente, o ID é informado pelo gestor, não gerado — ver schemas.ts.
 */
export async function criarEmpreendimento(input: {
  id_empreendimento: number; id_cidade: number; empreendimento: string; ativo: boolean;
}): Promise<R> {
  await exigirGestor();
  const parsed = empreendimentoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0].message };

  const pool = db();
  const { rows: existe } = await pool.query<{ id_empreendimento: number }>(
    `select id_empreendimento from empreendimentos where id_empreendimento = $1`,
    [parsed.data.id_empreendimento],
  );
  if (existe[0]) return { ok: false, erro: "Já existe um empreendimento com este ID." };

  try {
    await pool.query(
      `insert into empreendimentos (id_empreendimento, id_cidade, empreendimento, ativo)
       values ($1, $2, $3, $4)`,
      [parsed.data.id_empreendimento, parsed.data.id_cidade, parsed.data.empreendimento, parsed.data.ativo],
    );
  } catch (e) {
    const erro = e as { code?: string };
    if (erro.code === "23503") return { ok: false, erro: "Cidade inválida." };
    return { ok: false, erro: "Não foi possível cadastrar o empreendimento." };
  }
  return { ok: true };
}

export async function editarEmpreendimento(
  id: number,
  input: { id_cidade: number; empreendimento: string; ativo: boolean },
): Promise<R> {
  await exigirGestor();
  const parsed = empreendimentoEdicaoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0].message };

  try {
    await db().query(
      `update empreendimentos set id_cidade = $1, empreendimento = $2, ativo = $3 where id_empreendimento = $4`,
      [parsed.data.id_cidade, parsed.data.empreendimento, parsed.data.ativo, id],
    );
  } catch (e) {
    const erro = e as { code?: string };
    if (erro.code === "23503") return { ok: false, erro: "Cidade inválida." };
    return { ok: false, erro: "Não foi possível salvar as alterações." };
  }
  return { ok: true };
}

/** Ativa/inativa empreendimento (nunca exclui fisicamente — mesma regra dos agentes). */
export async function definirStatusEmpreendimento(id: number, ativo: boolean): Promise<R> {
  await exigirGestor();
  try {
    await db().query(`update empreendimentos set ativo = $1 where id_empreendimento = $2`, [ativo, id]);
  } catch {
    return { ok: false, erro: "Não foi possível alterar o status." };
  }
  return { ok: true };
}

/** Cadastro/atualização dos dados próprios do empreendimento (seção 25). */
export async function salvarDadosProprios(input: {
  id_empreendimento: number; mes_ano: string; estoque: number; vendas: number;
}): Promise<R> {
  const g = await exigirGestor();
  const parsed = dadosPropriosSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0].message };

  try {
    await db().query(
      `insert into dados_proprios_mensais
         (id_empreendimento, mes_ano, estoque, vendas, atualizado_por, atualizado_em)
       values ($1, $2, $3, $4, $5, now())
       on conflict (id_empreendimento, mes_ano) do update
         set estoque = excluded.estoque,
             vendas = excluded.vendas,
             atualizado_por = excluded.atualizado_por,
             atualizado_em = now()`,
      [parsed.data.id_empreendimento, parsed.data.mes_ano, parsed.data.estoque, parsed.data.vendas, g.id_gestor],
    );
  } catch {
    return { ok: false, erro: "Não foi possível salvar os dados próprios." };
  }
  return { ok: true };
}
